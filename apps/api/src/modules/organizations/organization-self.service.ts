import { randomUUID } from 'node:crypto'
import type { Role } from '@refs-tools/contracts/authorization'
import type { DirectoryQuery, MyOrganization, OrganizationApplication, OrganizationProfileUpdate, OrganizationProfileUpdated } from '@refs-tools/contracts/organization-self'
import type { PageQuery } from '@refs-tools/contracts/pagination'
import { canUpdateOrganizationProfile, isRoleBindingActive } from '@refs-tools/domain'
import type { ScopedRoleBinding } from '@refs-tools/contracts/authorization'
import { DomainError } from '../../application/errors.js'
import { appendAudit } from '../audit/audit.service.js'
import type { AccessDependencies, AccessRepositories, MineRow, NewOrganizationApplication } from './organization-access.types.js'
import { createOrganizationWithInvite } from './organization-platform-invites.redeem.js'

/** 同一申请人同时待审核的组织申请上限，防止批量占用平台审核队列。 */
export const PENDING_APPLICATION_LIMIT = 3
const organizationRoles: readonly Role[] = ['owner', 'organizer', 'certifier']

/**
 * 按实时授权矩阵计算本人在该组织的角色与能力。
 * 资源上下文与 resolveScope 保持一致，授权规则仍只有 permissionRules 一处来源。
 */
function project(row: MineRow, actor: string, bindings: readonly ScopedRoleBinding[], d: AccessDependencies, now: Date): MyOrganization {
  const resource = { type: 'organization' as const, id: row.id, organizationId: row.id, eventId: null, matchId: null,
    ownerUserId: row.ownerUserId, organizationStatus: row.status, state: row.status }
  const context = { subjectUserId: actor, now: now.toISOString(), bindings, resource, activeMember: row.membership?.status === 'active' }
  const roles = row.membership?.status === 'active' ? bindings.filter(binding => binding.scopeType === 'organization'
    && binding.scopeId === row.id && organizationRoles.includes(binding.role) && isRoleBindingActive(binding, context)).map(binding => binding.role) : []
  const isOwner = row.ownerUserId === actor
  return { id: row.id, name: row.name, region: row.region, purpose: row.purpose, status: row.status, createdAt: row.createdAt, version: row.version,
    isOwner, ownerUserId: row.ownerUserId, membership: row.membership, roles: [...new Set(roles)],
    canManage: d.permissions.isPermitted('organization.members.manage', context),
    canGrantRoles: d.permissions.isPermitted('role.manage', context),
    governanceReason: isOwner ? row.governanceReason : null }
}

/** 用户视角的组织用例：本人组织、公开目录与自助创建申请。 */
export class OrganizationSelfService {
  constructor(private readonly d: AccessDependencies) {}

  async mine(actor: string, query: PageQuery = {}) {
    const now = this.d.now()
    return this.d.transaction.run(async r => {
      if (!await r.identities.requireActiveActor(actor)) throw new DomainError('UNAUTHENTICATED', '请重新登录', 401)
      const [result, bindings] = await Promise.all([r.self.mine(actor, query), r.authorization.findBindings(actor)])
      return { ...result, items: result.items.map(row => project(row, actor, bindings, this.d, now)) }
    })
  }

  async directory(actor: string, query: DirectoryQuery) {
    return this.d.transaction.run(async r => {
      if (!await r.identities.requireActiveActor(actor)) throw new DomainError('UNAUTHENTICATED', '请重新登录', 401)
      return r.self.directory(actor, query)
    })
  }

  /**
   * 负责人即申请人；平台审核通过前不建立成员关系，也不授予任何角色。
   * 负责人实名与联系方式取自申请人账户资料，并在提交时快照进组织记录：审核看到的是提交当时的资料，
   * 之后本人修改账户资料不会改写已提交的申请。资料不完整返回 422 PROFILE_INCOMPLETE，前端据此引导补全。
   * 携带平台邀请码时组织直接以 active 创建（见 `createOrganizationWithInvite`）；该路径不占用待审核名额，
   * 因为它不会进入平台审核队列。邀请码无效统一返回 422 PLATFORM_INVITE_INVALID。
   */
  async apply(actor: string, input: OrganizationApplication) {
    const base = { name: input.name.trim(), region: input.region.trim(), purpose: input.purpose.trim() }
    if (Object.values(base).some(text => !text)) throw new DomainError('INVALID_ORGANIZATION', '请完整填写组织资料', 422)
    const now = this.d.now(), id = randomUUID()
    return this.d.transaction.run(async r => {
      if (!await r.identities.requireActiveActor(actor)) throw new DomainError('UNAUTHENTICATED', '请重新登录', 401)
      const profile = await r.self.applicantProfile(actor)
      const ownerLegalName = profile?.legalName?.trim(), contact = profile?.phone?.trim()
      if (!ownerLegalName || !contact) {
        throw new DomainError('PROFILE_INCOMPLETE', '请先在账号设置中填写真实姓名和手机号，再提交组织申请', 422)
      }
      const value = { ...base, ownerLegalName, contact }
      if (input.platformInviteToken) return this.applyWithInvite(r, actor, id, input.platformInviteToken, value, now)
      await r.self.lockApplicant(actor)
      if (await r.self.countPending(actor) >= PENDING_APPLICATION_LIMIT) {
        throw new DomainError('APPLICATION_LIMIT', `同时待审核的申请最多 ${PENDING_APPLICATION_LIMIT} 个，请等待平台审核后再提交`, 409)
      }
      await r.self.apply(id, actor, value, now)
      await appendAudit(r.audit, { actorUserId: actor, action: 'organization.created', resourceType: 'organization', resourceId: id,
        scopeType: 'platform', scopeId: null, organizationId: null, reason: null,
        before: null, after: { status: 'pending_review', version: 1, subjectUserId: actor } }, now)
      const row: MineRow = { id, name: value.name, region: value.region, purpose: value.purpose, status: 'pending_review',
        ownerUserId: actor, createdAt: now.toISOString(), version: 1, governanceReason: null, membership: null }
      return project(row, actor, [], this.d, now)
    })
  }

  /** 邀请码路径与普通申请共用同一事务；创建后重读真实组织、成员关系与角色再投影，不拼凑返回值。 */
  private async applyWithInvite(r: AccessRepositories, actor: string, id: string, token: string,
    value: NewOrganizationApplication, now: Date) {
    await createOrganizationWithInvite(r, actor, id, token, value, now)
    const organization = (await r.organizations.find(id))!
    const membership = await r.members.current(id, actor)
    const row: MineRow = { id, name: organization.name, region: organization.region, purpose: organization.purpose,
      status: organization.status, ownerUserId: organization.ownerUserId, createdAt: organization.createdAt,
      version: organization.version, governanceReason: organization.governanceReason,
      membership: membership && membership.status === 'active' ? { id: membership.id, status: 'active', version: membership.version } : null }
    return project(row, actor, await r.authorization.findBindings(actor), this.d, now)
  }

  /**
   * 负责人自助修改组织简介。写权限只看组织行的 `owner_user_id`：待审核组织尚无成员关系与 owner 角色，
   * 若要求角色绑定，负责人就无法在审核前修正简介；状态可写范围复用平台同一个领域函数。
   * 版本条件更新与审计同事务，审计快照只含状态、版本与负责人标识，不含简介正文。
   */
  async updateProfile(actor: string, id: string, input: OrganizationProfileUpdate) {
    const purpose = input.purpose.trim()
    if (!purpose) throw new DomainError('INVALID_ORGANIZATION', '请填写组织简介', 422)
    const now = this.d.now()
    return this.d.transaction.run(async r => {
      if (!await r.identities.requireActiveActor(actor)) throw new DomainError('UNAUTHENTICATED', '请重新登录', 401)
      const before = await r.organizations.find(id, true)
      if (!before) throw new DomainError('NOT_FOUND', '组织不存在', 404)
      if (before.ownerUserId !== actor) throw new DomainError('FORBIDDEN', '只有组织负责人可以修改简介', 403)
      if (before.version !== input.expectedVersion) throw new DomainError('VERSION_CONFLICT', '组织已更新，请重新读取后再操作', 409)
      if (!canUpdateOrganizationProfile(before.status)) {
        throw new DomainError('INVALID_ORGANIZATION_STATE', '当前组织状态不允许修改简介，请重新读取', 409)
      }
      if (!await r.self.updatePurpose(id, input.expectedVersion, purpose)) {
        throw new DomainError('VERSION_CONFLICT', '组织已更新，请重新读取后再操作', 409)
      }
      const after: OrganizationProfileUpdated = { id, purpose, version: before.version + 1 }
      await appendAudit(r.audit, { actorUserId: actor, action: 'organization.updated', resourceType: 'organization', resourceId: id,
        scopeType: 'organization', scopeId: id, organizationId: id, reason: null,
        before: { status: before.status, version: before.version, subjectUserId: before.ownerUserId },
        after: { status: before.status, version: after.version, subjectUserId: before.ownerUserId } }, now)
      return after
    })
  }
}
