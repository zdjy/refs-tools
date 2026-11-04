import { randomUUID } from 'node:crypto'
import type { CreateInvitation, MemberChange, MemberPageQuery } from '@refs-tools/contracts/organization-members'
import { DomainError } from '../../application/errors.js'
import { appendAudit } from '../audit/audit.service.js'
import { memberAccess, memberAudit, memberVersion } from './organization-members.access.js'
import type { MemberDependencies, MemberRepositories } from './organization-members.types.js'

/** 定向邀请不携带角色，接受后才建立正式成员关系。 */
export class OrganizationInvitationsService {
  constructor(private readonly d: MemberDependencies) {}

  async list(actor: string, id: string, query: MemberPageQuery) {
    const now = this.d.now()
    return this.d.transaction.run(async r => {
      const { canManage } = await memberAccess(r, this.d, actor, id, now, 'read')
      const result = await r.members.invitations({ organizationId: id }, query, now)
      await appendAudit(r.audit, { actorUserId: actor, action: 'invitation.queried', resourceType: 'organization', resourceId: id,
        scopeType: 'organization', scopeId: id, organizationId: id, before: null, after: null, reason: null }, now)
      return { ...result, canManage }
    })
  }

  async inbox(actor: string, query: MemberPageQuery) {
    const now = this.d.now()
    return this.d.transaction.run(async r => {
      if (!await r.identities.requireActiveActor(actor)) throw new DomainError('UNAUTHENTICATED', '请重新登录', 401)
      const result = await r.members.invitations({ userId: actor }, query, now)
      await appendAudit(r.audit, { actorUserId: actor, action: 'invitation.queried', resourceType: 'user', resourceId: actor,
        scopeType: 'self', scopeId: actor, organizationId: null, before: null, after: null, reason: null }, now)
      return { ...result, canManage: false }
    })
  }

  async create(actor: string, id: string, input: CreateInvitation) {
    const now = this.d.now(), invitationId = randomUUID(), expires = new Date(now.getTime() + input.validDays * 86_400_000)
    return this.d.transaction.run(async r => {
      await memberAccess(r, this.d, actor, id, now, 'manage')
      if (!await r.identities.requireActiveActor(input.userId)) throw new DomainError('INVALID_MEMBER', '目标用户须有效且邮箱已验证', 422)
      if ((await r.members.current(id, input.userId))?.status === 'active') throw new DomainError('ALREADY_MEMBER', '目标用户已是正式成员', 409)
      if (!await r.members.createInvitation(invitationId, id, input.userId, actor, now, expires)) {
        throw new DomainError('INVITATION_PENDING', '已有待回应邀请，请等待回应或先撤销', 409)
      }
      const after = (await r.members.invitation(id, invitationId, now))!
      await memberAudit(r, actor, id, invitationId, 'organization_invitation', now, null,
        { status: after.status, version: after.version, subjectUserId: after.userId })
      return after
    })
  }

  async revoke(actor: string, id: string, recordId: string, input: MemberChange) {
    const now = this.d.now(), reason = input.reason.trim()
    if (!reason) throw new DomainError('REASON_REQUIRED', '请填写撤销理由', 422)
    return this.d.transaction.run(async r => {
      await memberAccess(r, this.d, actor, id, now, 'manage')
      const before = await r.members.invitation(id, recordId, now)
      if (!before) throw new DomainError('NOT_FOUND', '邀请不存在', 404)
      memberVersion(before.version, input.expectedVersion)
      if (before.status !== 'pending') throw new DomainError('INVALID_INVITATION_STATE', '邀请已回应、撤销或过期', 409)
      if (!await r.members.changeInvitation(recordId, before.version, 'revoked')) memberVersion(0, input.expectedVersion)
      const after = (await r.members.invitation(id, recordId, now))!
      await memberAudit(r, actor, id, recordId, 'organization_invitation', now,
        { status: before.status, version: before.version }, { status: after.status, version: after.version }, reason)
      return after
    })
  }

  async respond(actor: string, id: string, recordId: string, action: 'accepted' | 'declined') {
    const now = this.d.now()
    return this.d.transaction.run(r => this.response(r, actor, id, recordId, action, now))
  }

  async accept(actor: string, id: string, recordId: string) {
    const now = this.d.now()
    return this.d.transaction.run(async r => {
      await this.response(r, actor, id, recordId, 'accepted', now)
      const member = await r.members.current(id, actor)
      if (member?.status !== 'active') throw new DomainError('INVALID_MEMBER_STATE', '成员关系已经结束，不能重放旧邀请重新入会', 409)
      return member
    })
  }

  private async response(r: MemberRepositories, actor: string, id: string, recordId: string, action: 'accepted' | 'declined', now: Date) {
    await memberAccess(r, this.d, actor, id, now, 'self')
    const before = await r.members.invitation(id, recordId, now)
    if (!before || before.userId !== actor) throw new DomainError('NOT_FOUND', '邀请不存在', 404)
    if (before.status === action) return before
    if (before.status !== 'pending') throw new DomainError('INVALID_INVITATION_STATE', '邀请已回应、撤销或过期', 409)
    if (action === 'accepted') {
      const current = await r.members.current(id, actor)
      if (current?.status !== 'active') {
        const member = await r.members.join(randomUUID(), id, actor, 'active')
        await memberAudit(r, actor, id, member.id, 'membership', now,
          current ? { status: current.status, version: current.version } : null,
          { status: member.status, version: member.version, subjectUserId: actor })
      }
    }
    if (!await r.members.changeInvitation(recordId, before.version, action)) memberVersion(0, before.version)
    const after = (await r.members.invitation(id, recordId, now))!
    await memberAudit(r, actor, id, recordId, 'organization_invitation', now,
      { status: before.status, version: before.version }, { status: after.status, version: after.version })
    return after
  }
}
