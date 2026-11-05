import { randomUUID } from 'node:crypto'
import { OWNERSHIP_TRANSFER_VALID_DAYS } from '@refs-tools/contracts/organization-ownership'
import type { CreateOwnershipTransfer, DecideOwnershipTransfer, OwnershipTransfer, PlatformOwnershipTransfer } from '@refs-tools/contracts/organization-ownership'
import type { PageQuery } from '@refs-tools/contracts/pagination'
import { canTransferOwnership } from '@refs-tools/domain'
import { DomainError } from '../../application/errors.js'
import { appendAudit } from '../audit/audit.service.js'
import { requirePermission } from '../authorization/authorization.service.js'
import { memberAccess } from './organization-members.access.js'
import { swapOwner, validateNewOwner } from './organization-ownership.swap.js'
import type { AccessDependencies, AccessRepositories } from './organization-access.types.js'

const conflict = () => new DomainError('VERSION_CONFLICT', '记录已更新，请重新读取', 409)
const notFound = () => new DomainError('NOT_FOUND', '移交请求不存在', 404)
type Snapshot = { status: OwnershipTransfer['status']; version: number }

async function transferAudit(r: AccessRepositories, actor: string, organizationId: string, id: string, now: Date,
  before: Snapshot | null, after: Snapshot, reason: string | null = null) {
  await appendAudit(r.audit, { actorUserId: actor, action: 'ownership_transfer.changed', resourceType: 'organization_ownership_transfer',
    resourceId: id, scopeType: 'organization', scopeId: organizationId, organizationId, before, after, reason }, now)
}

/** 移交请求是否仍可处理；到期的 pending 已被仓库投影为 expired，与已处理请求同样拒绝。 */
function requirePending(transfer: OwnershipTransfer, expectedVersion: number) {
  if (transfer.status !== 'pending') throw new DomainError('TRANSFER_NOT_PENDING', '移交请求已失效或已处理', 409)
  if (transfer.version !== expectedVersion) throw conflict()
}

/**
 * 所有权移交用例。负责人路径需接收人接受后才换手；平台路径由管理员直接处理并取代待处理请求。
 * 加锁顺序固定为「组织行 → 请求行」，与成员写入、冻结、撤权保持一致，避免用陈旧依据写入。
 */
export class OrganizationOwnershipService {
  constructor(private readonly d: AccessDependencies) {}

  /** 本组织的移交记录：负责人、组织者与平台管理员可读，写入仍只有负责人或接收人可执行。 */
  async list(actor: string, id: string, query: PageQuery = {}) {
    const now = this.d.now()
    return this.d.transaction.run(async r => {
      await memberAccess(r, this.d, actor, id, now, 'read')
      const result = await r.ownership.listByOrganization(id, query, now)
      await appendAudit(r.audit, { actorUserId: actor, action: 'ownership_transfer.queried', resourceType: 'organization',
        resourceId: id, scopeType: 'organization', scopeId: id, organizationId: id, before: null, after: null, reason: null }, now)
      return result
    })
  }

  /** 收件箱只读本人数据，不额外写读取审计。 */
  async incoming(actor: string, query: PageQuery = {}) {
    const now = this.d.now()
    return this.d.transaction.run(async r => {
      if (!await r.identities.requireActiveActor(actor)) throw new DomainError('UNAUTHENTICATED', '请重新登录', 401)
      return r.ownership.incoming(actor, query, now)
    })
  }
  /** 仅组织负责人可发起；先锁组织再读授权，负责人身份由实时的 owner 角色绑定判定。 */
  async create(actor: string, id: string, input: CreateOwnershipTransfer) {
    const now = this.d.now(), transferId = randomUUID()
    const expires = new Date(now.getTime() + OWNERSHIP_TRANSFER_VALID_DAYS * 86_400_000)
    return this.d.transaction.run(async r => {
      const organization = await r.organizations.find(id, true)
      if (!organization) throw new DomainError('NOT_FOUND', '组织不存在', 404)
      if (!await r.identities.requireActiveActor(actor)) throw new DomainError('UNAUTHENTICATED', '请重新登录', 401)
      await requirePermission(r.authorization, { subjectUserId: actor, permission: 'organization.manage',
        resource: { type: 'organization', id } }, now, this.d.permissions)
      if (!canTransferOwnership(organization.status, 'owner')) {
        throw new DomainError('ORGANIZATION_INACTIVE', '组织当前不接受所有权移交', 409)
      }
      await validateNewOwner(r, organization, input.toUserId)
      for (const stale of await r.ownership.expireStale(id, now)) {
        await transferAudit(r, actor, id, stale.id, now, { status: 'pending', version: stale.version - 1 }, { status: 'expired', version: stale.version })
      }
      if (!await r.ownership.create({ id: transferId, organizationId: id, fromUserId: actor, toUserId: input.toUserId }, now, expires)) {
        throw new DomainError('TRANSFER_PENDING', '已有待处理的移交请求，请先取消或等待对方处理', 409)
      }
      await transferAudit(r, actor, id, transferId, now, null, { status: 'pending', version: 1 })
      return (await r.ownership.find(id, transferId, now))!
    })
  }
  /** 接收人接受后才换手；接受时重新校验组织状态与发起人仍是负责人，因为有效期内事实可能已变化。 */
  async accept(actor: string, id: string, transferId: string, input: DecideOwnershipTransfer) {
    const now = this.d.now()
    return this.d.transaction.run(async r => {
      const { organization, transfer } = await this.load(r, actor, id, transferId, now, 'receiver')
      requirePending(transfer, input.expectedVersion)
      if (!canTransferOwnership(organization.status, 'owner')) {
        throw new DomainError('ORGANIZATION_INACTIVE', '组织当前不接受所有权移交', 409)
      }
      if (transfer.fromUserId !== organization.ownerUserId) throw new DomainError('TRANSFER_NOT_PENDING', '移交请求已失效或已处理', 409)
      if (!await r.ownership.decide(transferId, input.expectedVersion, 'accepted', now)) throw conflict()
      await swapOwner(r, actor, organization, actor, '接收人接受所有权移交', now)
      await transferAudit(r, actor, id, transferId, now, { status: 'pending', version: transfer.version }, { status: 'accepted', version: transfer.version + 1 })
      return (await r.ownership.find(id, transferId, now))!
    })
  }

  decline(actor: string, id: string, transferId: string, input: DecideOwnershipTransfer) {
    return this.settle(actor, id, transferId, input, 'receiver', 'declined')
  }

  cancel(actor: string, id: string, transferId: string, input: DecideOwnershipTransfer) {
    return this.settle(actor, id, transferId, input, 'sender', 'cancelled')
  }

  /** 拒绝与取消不改变所有权，因此不要求组织仍为 active：冻结后仍应能清理遗留请求。 */
  private async settle(actor: string, id: string, transferId: string, input: DecideOwnershipTransfer,
    party: 'receiver' | 'sender', status: 'declined' | 'cancelled') {
    const now = this.d.now()
    return this.d.transaction.run(async r => {
      const { transfer } = await this.load(r, actor, id, transferId, now, party)
      requirePending(transfer, input.expectedVersion)
      if (!await r.ownership.decide(transferId, input.expectedVersion, status, now)) throw conflict()
      await transferAudit(r, actor, id, transferId, now, { status: 'pending', version: transfer.version }, { status, version: transfer.version + 1 })
      return (await r.ownership.find(id, transferId, now))!
    })
  }

  /** 先锁组织行再锁请求行；非当事人按不存在处理，不泄露请求是否存在。 */
  private async load(r: AccessRepositories, actor: string, id: string, transferId: string, now: Date, party: 'receiver' | 'sender') {
    const organization = await r.organizations.find(id, true)
    if (!organization) throw new DomainError('NOT_FOUND', '组织不存在', 404)
    if (!await r.identities.requireActiveActor(actor)) throw new DomainError('UNAUTHENTICATED', '请重新登录', 401)
    const transfer = await r.ownership.find(id, transferId, now)
    if (!transfer || (party === 'receiver' ? transfer.toUserId : transfer.fromUserId) !== actor) throw notFound()
    return { organization, transfer }
  }

  /**
   * 平台管理员直接移交，不需要接收人确认（FS-0001 §4.3）。理由必填并进入审计，组织行版本防止基于过期详情操作。
   * 允许 active 与 frozen：负责人缺失的冻结组织需要平台换人后才能解冻。
   */
  async platformTransfer(actor: string, id: string, input: PlatformOwnershipTransfer) {
    const now = this.d.now(), reason = input.reason.trim()
    if (!reason) throw new DomainError('REASON_REQUIRED', '请填写操作理由', 422)
    return this.d.transaction.run(async r => {
      if (!await r.identities.requireActiveActor(actor)) throw new DomainError('UNAUTHENTICATED', '请重新登录', 401)
      await requirePermission(r.authorization, { subjectUserId: actor, permission: 'platform.manage',
        resource: { type: 'platform', id: null } }, now, this.d.permissions)
      const organization = await r.organizations.find(id, true)
      if (!organization) throw new DomainError('NOT_FOUND', '组织不存在', 404)
      if (organization.version !== input.expectedVersion) throw new DomainError('VERSION_CONFLICT', '组织已更新，请重新读取后再操作', 409)
      if (!canTransferOwnership(organization.status, 'platform')) {
        throw new DomainError('INVALID_ORGANIZATION_STATE', '当前组织状态不允许所有权移交，请重新读取', 409)
      }
      await swapOwner(r, actor, organization, input.toUserId, reason, now)
      return (await r.organizations.find(id))!
    })
  }
}
