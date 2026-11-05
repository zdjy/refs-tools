import { createHash, randomBytes, randomUUID } from 'node:crypto'
import type { CreateJoinCode, RevokeJoinCode } from '@refs-tools/contracts/organization-access'
import { DomainError } from '../../application/errors.js'
import { appendAudit } from '../audit/audit.service.js'
import { memberAccess, memberAudit, memberVersion } from './organization-members.access.js'
import type { AccessDependencies, AccessRepositories } from './organization-access.types.js'

/** 每个组织同时有效的成员码上限，避免凭据无限堆积。 */
export const ACTIVE_JOIN_CODE_LIMIT = 10
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')
// 不区分「不存在、已撤销、已过期、已用尽」，避免成员码被用来探测状态。
const invalid = () => new DomainError('JOIN_CODE_INVALID', '成员码无效、已过期或已用尽', 422)

async function codeAudit(r: AccessRepositories, actor: string, organizationId: string, id: string, now: Date,
  before: { status: 'active' | 'exhausted' | 'expired' | 'revoked'; version: number } | null,
  after: { status: 'active' | 'exhausted' | 'expired' | 'revoked'; version: number }, reason: string | null = null) {
  await appendAudit(r.audit, { actorUserId: actor, action: 'join_code.changed', resourceType: 'organization_join_code', resourceId: id,
    scopeType: 'organization', scopeId: organizationId, organizationId, before, after, reason }, now)
}

/** 成员码仅用于加入组织：不携带角色，兑换成功也只建立 active 成员关系。 */
export class OrganizationJoinCodesService {
  constructor(private readonly d: AccessDependencies) {}

  async list(actor: string, id: string) {
    const now = this.d.now()
    return this.d.transaction.run(async r => {
      await memberAccess(r, this.d, actor, id, now, 'manage')
      const items = await r.joinCodes.list(id, now)
      await appendAudit(r.audit, { actorUserId: actor, action: 'join_code.queried', resourceType: 'organization', resourceId: id,
        scopeType: 'organization', scopeId: id, organizationId: id, before: null, after: null, reason: null }, now)
      return { items }
    })
  }

  /** 明文只在本响应返回一次，数据库与审计都不保存；丢失后只能撤销并重新生成。 */
  async create(actor: string, id: string, input: CreateJoinCode) {
    const now = this.d.now(), expires = new Date(now.getTime() + input.validDays * 86_400_000)
    const token = `rj_${randomBytes(32).toString('base64url')}`, codeId = randomUUID()
    return this.d.transaction.run(async r => {
      await memberAccess(r, this.d, actor, id, now, 'manage')
      if (await r.joinCodes.countActive(id, now) >= ACTIVE_JOIN_CODE_LIMIT) {
        throw new DomainError('JOIN_CODE_LIMIT', `同时有效的成员码最多 ${ACTIVE_JOIN_CODE_LIMIT} 个，请先撤销不再使用的成员码`, 409)
      }
      await r.joinCodes.create({ id: codeId, organizationId: id, tokenHash: hashToken(token), hint: token.slice(-4),
        maxUses: input.maxUses, createdBy: actor }, now, expires)
      const code = (await r.joinCodes.find(id, codeId, now))!
      await codeAudit(r, actor, id, codeId, now, null, { status: code.status, version: code.version })
      return { code, token }
    })
  }

  async revoke(actor: string, id: string, codeId: string, input: RevokeJoinCode) {
    const now = this.d.now()
    return this.d.transaction.run(async r => {
      await memberAccess(r, this.d, actor, id, now, 'manage')
      const before = await r.joinCodes.find(id, codeId, now)
      if (!before) throw new DomainError('NOT_FOUND', '成员码不存在', 404)
      memberVersion(before.version, input.expectedVersion)
      if (before.status === 'revoked') throw new DomainError('INVALID_JOIN_CODE_STATE', '成员码已撤销', 409)
      if (!await r.joinCodes.revoke(codeId, input.expectedVersion, now)) memberVersion(0, input.expectedVersion)
      const after = (await r.joinCodes.find(id, codeId, now))!
      await codeAudit(r, actor, id, codeId, now, { status: before.status, version: before.version },
        { status: after.status, version: after.version }, '组织管理者撤销')
      return after
    })
  }

  /** 兑换成功只建立 active 成员关系；重新入会不恢复历史管理角色。 */
  async redeem(actor: string, token: string) {
    const now = this.d.now(), tokenHash = hashToken(token)
    return this.d.transaction.run(async r => {
      const organizationId = await r.joinCodes.organizationOf(tokenHash)
      if (!organizationId) throw invalid()
      // 先锁组织再消费，与创建/撤销的加锁顺序一致；组织非 active 时 self 模式直接拒绝。
      await memberAccess(r, this.d, actor, organizationId, now, 'self')
      const current = await r.members.current(organizationId, actor)
      if (current?.status === 'active') return current
      const code = await r.joinCodes.consume(tokenHash, organizationId, now)
      if (!code) throw invalid()
      const member = await r.members.join(randomUUID(), organizationId, actor, 'active')
      await memberAudit(r, actor, organizationId, member.id, 'membership', now,
        current ? { status: current.status, version: current.version } : null,
        { status: member.status, version: member.version, subjectUserId: actor })
      await codeAudit(r, actor, organizationId, code.id, now, { status: 'active', version: code.version },
        { status: code.status, version: code.version })
      return member
    })
  }
}
