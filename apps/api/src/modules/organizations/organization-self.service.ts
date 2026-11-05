import { randomUUID } from 'node:crypto'
import type { Role } from '@refs-tools/contracts/authorization'
import type { DirectoryQuery, MyOrganization, OrganizationApplication } from '@refs-tools/contracts/organization-self'
import { isRoleBindingActive } from '@refs-tools/domain'
import type { ScopedRoleBinding } from '@refs-tools/contracts/authorization'
import { DomainError } from '../../application/errors.js'
import { appendAudit } from '../audit/audit.service.js'
import type { AccessDependencies, MineRow } from './organization-access.types.js'

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
  return { id: row.id, name: row.name, region: row.region, purpose: row.purpose, status: row.status, createdAt: row.createdAt,
    isOwner, ownerUserId: row.ownerUserId, membership: row.membership, roles: [...new Set(roles)],
    canManage: d.permissions.isPermitted('organization.members.manage', context),
    canGrantRoles: d.permissions.isPermitted('role.manage', context),
    governanceReason: isOwner ? row.governanceReason : null }
}

/** 用户视角的组织用例：本人组织、公开目录与自助创建申请。 */
export class OrganizationSelfService {
  constructor(private readonly d: AccessDependencies) {}

  async mine(actor: string) {
    const now = this.d.now()
    return this.d.transaction.run(async r => {
      if (!await r.identities.requireActiveActor(actor)) throw new DomainError('UNAUTHENTICATED', '请重新登录', 401)
      const [rows, bindings] = await Promise.all([r.self.mine(actor), r.authorization.findBindings(actor)])
      return { items: rows.map(row => project(row, actor, bindings, this.d, now)) }
    })
  }

  async directory(actor: string, query: DirectoryQuery) {
    return this.d.transaction.run(async r => {
      if (!await r.identities.requireActiveActor(actor)) throw new DomainError('UNAUTHENTICATED', '请重新登录', 401)
      return r.self.directory(actor, query)
    })
  }

  /** 负责人即申请人；平台审核通过前不建立成员关系，也不授予任何角色。 */
  async apply(actor: string, input: OrganizationApplication) {
    const value = { name: input.name.trim(), region: input.region.trim(), purpose: input.purpose.trim(),
      ownerLegalName: input.ownerLegalName.trim(), contact: input.contact.trim() }
    if (Object.values(value).some(text => !text)) throw new DomainError('INVALID_ORGANIZATION', '请完整填写组织与负责人资料', 422)
    const now = this.d.now(), id = randomUUID()
    return this.d.transaction.run(async r => {
      if (!await r.identities.requireActiveActor(actor)) throw new DomainError('UNAUTHENTICATED', '请重新登录', 401)
      await r.self.lockApplicant(actor)
      if (await r.self.countPending(actor) >= PENDING_APPLICATION_LIMIT) {
        throw new DomainError('APPLICATION_LIMIT', `同时待审核的申请最多 ${PENDING_APPLICATION_LIMIT} 个，请等待平台审核后再提交`, 409)
      }
      await r.self.apply(id, actor, value, now)
      await appendAudit(r.audit, { actorUserId: actor, action: 'organization.created', resourceType: 'organization', resourceId: id,
        scopeType: 'platform', scopeId: null, organizationId: null, reason: null,
        before: null, after: { status: 'pending_review', version: 1, subjectUserId: actor } }, now)
      const row: MineRow = { id, name: value.name, region: value.region, purpose: value.purpose, status: 'pending_review',
        ownerUserId: actor, createdAt: now.toISOString(), governanceReason: null, membership: null }
      return project(row, actor, [], this.d, now)
    })
  }
}
