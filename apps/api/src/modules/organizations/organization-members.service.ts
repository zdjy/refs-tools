import { randomUUID } from 'node:crypto'
import type { MemberChange, MemberPageQuery, MembershipDecision } from '@refs-tools/contracts/organization-members'
import { membershipStatusAfter } from '@refs-tools/domain'
import { DomainError } from '../../application/errors.js'
import { appendAudit } from '../audit/audit.service.js'
import { memberAccess, memberAudit, memberVersion, revokeMemberRoles } from './organization-members.access.js'
import type { MemberDependencies } from './organization-members.types.js'

/** 成员管理读取可供平台治理，写入仅由组织运营权限或成员本人发起。 */
export class OrganizationMembersService {
  constructor(private readonly d: MemberDependencies) {}

  async list(actor: string, id: string, query: MemberPageQuery) {
    const now = this.d.now()
    return this.d.transaction.run(async r => {
      const { canManage } = await memberAccess(r, this.d, actor, id, now, 'read')
      const result = await r.members.members(id, query)
      await appendAudit(r.audit, { actorUserId: actor, action: 'membership.queried', resourceType: 'organization', resourceId: id,
        scopeType: 'organization', scopeId: id, organizationId: id, before: null, after: null, reason: null }, now)
      return { ...result, canManage }
    })
  }

  async request(actor: string, id: string) {
    const now = this.d.now()
    return this.d.transaction.run(async r => {
      await memberAccess(r, this.d, actor, id, now, 'self')
      const current = await r.members.current(id, actor)
      if (current) return current
      const after = await r.members.join(randomUUID(), id, actor, 'pending')
      await memberAudit(r, actor, id, after.id, 'membership', now, null,
        { status: after.status, version: after.version, subjectUserId: actor })
      return after
    })
  }

  async decide(actor: string, id: string, recordId: string, input: MembershipDecision) {
    return this.change(actor, id, recordId, input, false)
  }

  async leave(actor: string, id: string, recordId: string, input: MemberChange) {
    return this.change(actor, id, recordId, { ...input, action: 'remove' }, true)
  }

  private async change(actor: string, id: string, recordId: string, input: MembershipDecision, self: boolean) {
    const now = this.d.now(), reason = input.reason.trim()
    if (!reason) throw new DomainError('REASON_REQUIRED', '请填写操作理由', 422)
    return this.d.transaction.run(async r => {
      const { organization } = await memberAccess(r, this.d, actor, id, now, self ? 'self' : 'manage')
      const before = await r.members.membership(id, recordId)
      if (!before || (self && before.userId !== actor)) throw new DomainError('NOT_FOUND', '成员记录不存在', 404)
      memberVersion(before.version, input.expectedVersion)
      if (input.action === 'remove' && (before.userId === organization.ownerUserId || (!self && before.userId === actor))) {
        throw new DomainError('PROTECTED_MEMBER', '不能移除组织所有者或通过管理操作移除自己', 409)
      }
      const status = membershipStatusAfter(before.status, self ? 'leave' : input.action)
      if (!status) throw new DomainError('INVALID_MEMBER_STATE', '当前成员状态不允许此操作', 409)
      if (input.action === 'approve' && !await r.identities.requireActiveActor(before.userId)) {
        throw new DomainError('INVALID_MEMBER', '目标用户须有效且邮箱已验证', 422)
      }
      if (input.action === 'remove') await revokeMemberRoles(r, actor, before.userId, id, now)
      if (!await r.members.changeMember(recordId, input.expectedVersion, status)) memberVersion(0, input.expectedVersion)
      const after = (await r.members.membership(id, recordId))!
      await memberAudit(r, actor, id, recordId, 'membership', now,
        { status: before.status, version: before.version, subjectUserId: before.userId },
        { status: after.status, version: after.version, subjectUserId: after.userId }, reason)
      return after
    })
  }
}
