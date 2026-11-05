import { createHash, randomBytes, randomUUID } from 'node:crypto'
import type { CreatePlatformInvite, PlatformInvite, PlatformInviteQuery, RevokePlatformInvite } from '@refs-tools/contracts/platform-invites'
import { DomainError } from '../../application/errors.js'
import { appendAudit } from '../audit/audit.service.js'
import { requirePermission } from '../authorization/authorization.service.js'
import type { AccessDependencies, AccessRepositories } from './organization-access.types.js'

export const hashPlatformInvite = (token: string) => createHash('sha256').update(token).digest('hex')
type Snapshot = { status: PlatformInvite['status']; version: number }

async function inviteAudit(r: AccessRepositories, actor: string, id: string, now: Date, before: Snapshot | null, after: Snapshot, reason: string | null = null) {
  await appendAudit(r.audit, { actorUserId: actor, action: 'platform_invite.changed', resourceType: 'platform_organization_invite',
    resourceId: id, scopeType: 'platform', scopeId: null, organizationId: null, before, after, reason }, now)
}

/** 平台管理端的组织创建邀请码：仅平台管理员可发放，一次性使用，兑换发生在用户自助申请用例内。 */
export class PlatformInvitesService {
  constructor(private readonly d: AccessDependencies) {}

  private async authorize(r: AccessRepositories, actor: string, now: Date) {
    if (!await r.identities.requireActiveActor(actor)) throw new DomainError('UNAUTHENTICATED', '请重新登录', 401)
    await requirePermission(r.authorization, { subjectUserId: actor, permission: 'platform.manage',
      resource: { type: 'platform', id: null } }, now, this.d.permissions)
  }

  async list(actor: string, query: PlatformInviteQuery) {
    const now = this.d.now()
    return this.d.transaction.run(async r => {
      await this.authorize(r, actor, now)
      const result = await r.platformInvites.list(query, now)
      await appendAudit(r.audit, { actorUserId: actor, action: 'platform_invite.queried', resourceType: 'platform_organization_invite',
        resourceId: actor, scopeType: 'platform', scopeId: null, organizationId: null, before: null, after: null, reason: null }, now)
      return result
    })
  }

  /** 明文只在本响应返回一次，库与审计都不保存；丢失后只能撤销并重新生成。 */
  async create(actor: string, input: CreatePlatformInvite) {
    const now = this.d.now(), expires = new Date(now.getTime() + input.validDays * 86_400_000)
    const token = `ro_${randomBytes(32).toString('base64url')}`, id = randomUUID()
    return this.d.transaction.run(async r => {
      await this.authorize(r, actor, now)
      await r.platformInvites.create({ id, tokenHash: hashPlatformInvite(token), hint: token.slice(-4), createdBy: actor }, now, expires)
      const invite = (await r.platformInvites.find(id, now))!
      await inviteAudit(r, actor, id, now, null, { status: invite.status, version: invite.version })
      return { invite, token }
    })
  }

  async revoke(actor: string, id: string, input: RevokePlatformInvite) {
    const now = this.d.now()
    return this.d.transaction.run(async r => {
      await this.authorize(r, actor, now)
      const before = await r.platformInvites.find(id, now)
      if (!before) throw new DomainError('NOT_FOUND', '邀请码不存在', 404)
      if (before.version !== input.expectedVersion) throw new DomainError('VERSION_CONFLICT', '记录已更新，请重新读取', 409)
      // 只有仍可使用的码才能撤销；已使用、已过期或已撤销再撤销没有意义。
      if (before.status !== 'active') throw new DomainError('INVALID_PLATFORM_INVITE_STATE', '该邀请码当前不可撤销，请重新读取', 409)
      if (!await r.platformInvites.revoke(id, input.expectedVersion, now)) {
        throw new DomainError('VERSION_CONFLICT', '记录已更新，请重新读取', 409)
      }
      const after = (await r.platformInvites.find(id, now))!
      await inviteAudit(r, actor, id, now, { status: before.status, version: before.version },
        { status: after.status, version: after.version }, '平台管理员撤销')
      return after
    })
  }
}
