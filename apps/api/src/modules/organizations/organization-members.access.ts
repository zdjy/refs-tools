import type { AuditSnapshot } from '@refs-tools/contracts/audit'
import { DomainError } from '../../application/errors.js'
import { appendAudit } from '../audit/audit.service.js'
import { requirePermission } from '../authorization/authorization.service.js'
import type { MemberDependencies, MemberRepositories } from './organization-members.types.js'

/** 先锁组织再读授权，避免成员写入与冻结、撤权之间使用陈旧依据。 */
export async function memberAccess(r: MemberRepositories, d: MemberDependencies, actor: string, id: string, now: Date, mode: 'manage' | 'read' | 'roster' | 'self') {
  const organization = await r.organizations.find(id, true)
  if (!organization) throw new DomainError('NOT_FOUND', '组织不存在', 404)
  if (!await r.identities.requireActiveActor(actor)) throw new DomainError('UNAUTHENTICATED', '请重新登录', 401)
  if (mode === 'self') {
    if (organization.status !== 'active') throw new DomainError('ORGANIZATION_INACTIVE', '组织当前不接受成员变更', 409)
    return { organization, canManage: false, canGrant: false, activeOnly: false }
  }
  const resource = await r.authorization.resolveScope({ type: 'organization', id })
  const context = { subjectUserId: actor, resource: resource!, bindings: await r.authorization.findBindings(actor),
    activeMember: await r.authorization.isActiveMember(actor, id), now: now.toISOString() }
  const canManage = !!resource && d.permissions.isPermitted('organization.members.manage', context)
  // 角色授予仅限组织 owner；平台角色的范围不覆盖组织资源，因此平台管理员得到 false。
  const canGrant = !!resource && d.permissions.isPermitted('role.manage', context)
  if (mode === 'roster' && context.activeMember) {
    return { organization, canManage, canGrant, activeOnly: !canManage }
  }
  if (!canManage) await requirePermission(r.authorization, { subjectUserId: actor,
    permission: mode !== 'manage' ? 'platform.manage' : 'organization.members.manage',
    resource: mode !== 'manage' ? { type: 'platform', id: null } : { type: 'organization', id } }, now, d.permissions)
  return { organization, canManage, canGrant, activeOnly: false }
}

/** 仅保存状态、版本与账号标识；与业务变更处于同一事务。 */
export async function memberAudit(r: MemberRepositories, actor: string, organizationId: string, id: string,
  type: 'membership' | 'organization_invitation', now: Date, before: AuditSnapshot | null, after: AuditSnapshot | null, reason: string | null = null) {
  await appendAudit(r.audit, { actorUserId: actor, action: type === 'membership' ? 'membership.changed' : 'invitation.changed',
    resourceType: type, resourceId: id, scopeType: 'organization', scopeId: organizationId, organizationId, before, after, reason }, now)
}

/** 版本不匹配必须重新读取，禁止用陈旧表单覆盖已完成决定。 */
export function memberVersion(actual: number, expected: number) {
  if (actual !== expected) throw new DomainError('VERSION_CONFLICT', '记录已更新，请重新读取', 409)
}

/** 移除和退出使用相同撤权流程，重新入会不会重新激活管理角色。 */
export async function revokeMemberRoles(r: MemberRepositories, actor: string, userId: string, organizationId: string, now: Date) {
  for (const binding of await r.authorization.findBindings(userId)) {
    if (binding.scopeType === 'platform') continue
    const scope = await r.authorization.resolveScope({ type: binding.scopeType, id: binding.scopeId })
    if (scope?.organizationId !== organizationId) continue
    if (await r.authorization.revokeBinding(binding.id, now.toISOString())) {
      await appendAudit(r.audit, { actorUserId: actor, action: 'role.revoked', resourceType: 'role_binding', resourceId: binding.id,
        scopeType: binding.scopeType, scopeId: binding.scopeId, organizationId, reason: null,
        before: { role: binding.role, subjectUserId: userId, scopeType: binding.scopeType, scopeId: binding.scopeId }, after: null }, now)
    }
  }
}
