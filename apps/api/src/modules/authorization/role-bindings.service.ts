import { randomUUID } from 'node:crypto'
import type { ScopedRoleBinding } from '@refs-tools/contracts/authorization'
import { isValidRoleScope } from '@refs-tools/domain'
import { DomainError } from '../../application/errors.js'
import { appendAudit } from '../audit/audit.service.js'
import type { AuditRepository } from '../audit/audit.types.js'
import { requirePermission } from './authorization.service.js'
import type { AuthorizationDependencies, AuthorizationRepository, NewRoleBinding, PermissionEvaluator } from './authorization.types.js'

function validateGrant(input: NewRoleBinding, now: Date): void {
  if (!isValidRoleScope(input.role, input.scope.type, input.scope.id) || input.role === 'owner'
    || (input.role === 'organizer' && input.scope.type !== 'organization')
    || (input.expiresAt !== null && !(Date.parse(input.expiresAt) > now.getTime()))) {
    throw new DomainError('INVALID_ROLE_BINDING', '角色范围或有效期不符合要求', 422)
  }
}

export async function auditBinding(audit: AuditRepository, actor: string, binding: ScopedRoleBinding,
  organizationId: string | null, revoked: boolean, now: Date): Promise<void> {
  const snapshot = { role: binding.role, subjectUserId: binding.subjectUserId, scopeType: binding.scopeType, scopeId: binding.scopeId }
  await appendAudit(audit, { actorUserId: actor, action: revoked ? 'role.revoked' : 'role.granted',
    resourceType: 'role_binding', resourceId: binding.id, scopeType: binding.scopeType, scopeId: binding.scopeId,
    organizationId, reason: null, before: revoked ? { ...snapshot, status: 'active' } : null,
    after: { ...snapshot, status: revoked ? 'revoked' : 'active' } }, now)
}

async function requireGrantAuthority(authorization: AuthorizationRepository, actor: string, input: NewRoleBinding, now: Date,
  permissions: PermissionEvaluator) {
  return requirePermission(authorization, { subjectUserId: actor,
    permission: input.role === 'head_referee' ? 'role.delegate' : 'role.manage', resource: input.scope }, now, permissions)
}

/** 内部角色用例；变更与审计同事务，owner 的创建/移交只允许未来组织所有权专用流程处理。 */
export class RoleBindingService {
  constructor(private readonly dependencies: AuthorizationDependencies) {}

  async grant(actor: string, input: NewRoleBinding): Promise<ScopedRoleBinding> {
    const now = this.dependencies.now()
    validateGrant(input, now)
    return this.dependencies.transaction.run(async ({ authorization, audit }) => {
      const scope = await requireGrantAuthority(authorization, actor, input, now, this.dependencies.permissions)
      const target = await authorization.resolveScope({ type: 'self', id: input.subjectUserId })
      if (!target || (scope.organizationId && !await authorization.isActiveMember(input.subjectUserId, scope.organizationId))) {
        throw new DomainError('TARGET_NOT_MEMBER', '目标用户必须有效且属于当前组织', 422)
      }
      const binding: ScopedRoleBinding = { id: randomUUID(), subjectUserId: input.subjectUserId, role: input.role,
        scopeType: input.scope.type, scopeId: input.scope.id, grantedBy: actor, startsAt: now.toISOString(),
        expiresAt: input.expiresAt, revokedAt: null }
      if (!await authorization.insertBinding(binding)) throw new DomainError('ROLE_ALREADY_BOUND', '角色已绑定，请先撤销旧绑定', 409)
      await auditBinding(audit, actor, binding, scope.organizationId, false, now)
      return binding
    })
  }

  async revoke(actor: string, id: string): Promise<{ revoked: true }> {
    const now = this.dependencies.now()
    return this.dependencies.transaction.run(async ({ authorization, audit }) => {
      const binding = await authorization.findBinding(id)
      if (!binding || binding.role === 'owner') throw new DomainError('NOT_FOUND', '请求的资源不存在', 404)
      const scope = await requireGrantAuthority(authorization, actor, { subjectUserId: binding.subjectUserId, role: binding.role,
        scope: { type: binding.scopeType, id: binding.scopeId }, expiresAt: binding.expiresAt }, now, this.dependencies.permissions)
      if (await authorization.revokeBinding(id, now.toISOString())) await auditBinding(audit, actor, binding, scope.organizationId, true, now)
      return { revoked: true }
    })
  }
}
