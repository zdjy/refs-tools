import { randomUUID } from 'node:crypto'
import { DomainError } from '../../application/errors.js'
import { appendAudit } from '../audit/audit.service.js'
import type { AuthorizationRepositories } from '../authorization/authorization.types.js'

type RoleRepositories = AuthorizationRepositories
const ownerRoles = ['owner', 'organizer'] as const

/**
 * 授予负责人角色 owner + organizer，并逐条写 `role.granted` 审计，与调用方事务同连接。
 * `actor` 是审计行为人，`grantedBy` 是授权来源（邀请码直通时为发码管理员，行为人是申请人）。
 * owner 已存在说明该组织已有负责人，直接冲突；organizer 仅在 `strict` 时冲突，
 * 移交时新负责人可能本就是组织者，重复绑定按已具备处理。
 */
export async function grantOwnerRoles(r: RoleRepositories, input: { actor: string; grantedBy: string; organizationId: string; userId: string }, now: Date, strict: boolean) {
  for (const role of ownerRoles) {
    const bindingId = randomUUID()
    const inserted = await r.authorization.insertBinding({ id: bindingId, subjectUserId: input.userId, role, scopeType: 'organization',
      scopeId: input.organizationId, grantedBy: input.grantedBy, startsAt: now.toISOString(), expiresAt: null, revokedAt: null })
    if (!inserted) {
      if (role === 'owner' || strict) throw new DomainError('ROLE_ALREADY_BOUND', '组织已有负责人角色，请核对后再操作', 409)
      continue
    }
    await appendAudit(r.audit, { actorUserId: input.actor, action: 'role.granted', resourceType: 'role_binding',
      resourceId: bindingId, scopeType: 'organization', scopeId: input.organizationId, organizationId: input.organizationId,
      reason: null, before: null, after: { role, subjectUserId: input.userId, scopeType: 'organization', scopeId: input.organizationId } }, now)
  }
}
