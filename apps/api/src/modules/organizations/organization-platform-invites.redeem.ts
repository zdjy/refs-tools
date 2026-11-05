import { randomUUID } from 'node:crypto'
import { DomainError } from '../../application/errors.js'
import { appendAudit } from '../audit/audit.service.js'
import { grantOwnerRoles } from './organization-owner-roles.js'
import { hashPlatformInvite } from './organization-platform-invites.service.js'
import type { AccessRepositories, NewOrganizationApplication } from './organization-access.types.js'

// 不区分「不存在、已使用、已撤销、已过期」，避免邀请码被用来探测状态。
const invalid = () => new DomainError('PLATFORM_INVITE_INVALID', '邀请码无效、已使用或已过期', 422)
const REVIEW_REASON = '凭平台邀请码创建，免平台审核'

/**
 * 凭平台邀请码创建并直接启用组织（FS-0001 §4.1），与自助申请共用调用方的事务。
 * 先建 pending 行以满足邀请码使用记录的外键，再用单条条件 UPDATE 消费；消费不到则抛错，
 * 由事务回滚撤掉刚建的组织。审核人记为发码管理员，行为人仍是申请人。
 * 调用方已校验账号有效并取得负责人资料快照。
 */
export async function createOrganizationWithInvite(r: AccessRepositories, actor: string, id: string, token: string,
  value: NewOrganizationApplication, now: Date) {
  await r.self.apply(id, actor, value, now)
  const invite = await r.platformInvites.consume(hashPlatformInvite(token), actor, id, now)
  if (!invite) throw invalid()
  const scope = { scopeType: 'platform' as const, scopeId: null, organizationId: null }
  if (!await r.organizations.changeStatus(id, 1, 'active', invite.createdBy, REVIEW_REASON, true, now)) throw invalid()
  await r.organizations.activateOwnerMembership(randomUUID(), id, actor)
  await grantOwnerRoles(r, { actor, grantedBy: invite.createdBy, organizationId: id, userId: actor }, now, true)
  await appendAudit(r.audit, { actorUserId: actor, action: 'organization.created', resourceType: 'organization', resourceId: id,
    ...scope, reason: null, before: null, after: { status: 'pending_review', version: 1, subjectUserId: actor } }, now)
  await appendAudit(r.audit, { actorUserId: actor, action: 'organization.reviewed', resourceType: 'organization', resourceId: id,
    ...scope, reason: REVIEW_REASON, before: { status: 'pending_review', version: 1, subjectUserId: actor },
    after: { status: 'active', version: 2, subjectUserId: actor } }, now)
  await appendAudit(r.audit, { actorUserId: actor, action: 'platform_invite.changed', resourceType: 'platform_organization_invite',
    resourceId: invite.id, ...scope, reason: null, before: { status: 'active', version: invite.version - 1 },
    after: { status: 'used', version: invite.version } }, now)
}
