import { randomUUID } from 'node:crypto'
import type { ScopedRoleBinding } from '@refs-tools/contracts/authorization'
import type { GrantRole } from '@refs-tools/contracts/organization-access'
import type { PageQuery } from '@refs-tools/contracts/pagination'
import { DomainError } from '../../application/errors.js'
import { appendAudit } from '../audit/audit.service.js'
import { auditBinding } from '../authorization/role-bindings.service.js'
import { requirePermission } from '../authorization/authorization.service.js'
import { memberAccess } from './organization-members.access.js'
import type { AccessDependencies } from './organization-access.types.js'

/** 组织角色的读取与授予/撤销；仅 owner 可写，授权、变更与审计共用同一事务。 */
export class OrganizationRolesService {
  constructor(private readonly d: AccessDependencies) {}

  async list(actor: string, id: string, query: PageQuery = {}) {
    const now = this.d.now()
    return this.d.transaction.run(async r => {
      const { canGrant } = await memberAccess(r, this.d, actor, id, now, 'read')
      const result = await r.roles.list(id, query, now)
      await appendAudit(r.audit, { actorUserId: actor, action: 'membership.queried', resourceType: 'organization', resourceId: id,
        scopeType: 'organization', scopeId: id, organizationId: id, before: null, after: null, reason: null }, now)
      return { ...result, canGrant }
    })
  }

  async grant(actor: string, id: string, input: GrantRole) {
    const now = this.d.now()
    return this.d.transaction.run(async r => {
      await memberAccess(r, this.d, actor, id, now, 'manage')
      // organizer 无权授予角色：role.manage 只矩阵授予 owner（平台角色不覆盖组织资源）。
      await requirePermission(r.authorization, { subjectUserId: actor, permission: 'role.manage',
        resource: { type: 'organization', id } }, now, this.d.permissions)
      if (!await r.identities.requireActiveActor(input.userId) || !await r.authorization.isActiveMember(input.userId, id)) {
        throw new DomainError('TARGET_NOT_MEMBER', '目标用户必须是组织的正式成员且账号有效', 422)
      }
      const binding: ScopedRoleBinding = { id: randomUUID(), subjectUserId: input.userId, role: input.role, scopeType: 'organization',
        scopeId: id, grantedBy: actor, startsAt: now.toISOString(), expiresAt: null, revokedAt: null }
      if (!await r.authorization.insertBinding(binding)) throw new DomainError('ROLE_ALREADY_BOUND', '该成员已拥有此角色', 409)
      await auditBinding(r.audit, actor, binding, id, false, now)
      return (await r.roles.find(id, binding.id, now))!
    })
  }

  /** owner 角色由所有权流程维护，不能经此撤销；跨组织绑定 ID 一律按不存在处理。 */
  async revoke(actor: string, id: string, bindingId: string) {
    const now = this.d.now()
    return this.d.transaction.run(async r => {
      await memberAccess(r, this.d, actor, id, now, 'manage')
      await requirePermission(r.authorization, { subjectUserId: actor, permission: 'role.manage',
        resource: { type: 'organization', id } }, now, this.d.permissions)
      const binding = await r.authorization.findBinding(bindingId)
      if (!binding || binding.scopeType !== 'organization' || binding.scopeId !== id
        || (binding.role !== 'organizer' && binding.role !== 'certifier')) throw new DomainError('NOT_FOUND', '角色绑定不存在', 404)
      // 已撤销的绑定重复撤销是幂等的，不重复写审计。
      if (await r.authorization.revokeBinding(bindingId, now.toISOString())) await auditBinding(r.audit, actor, binding, id, true, now)
      return { revoked: true as const }
    })
  }
}
