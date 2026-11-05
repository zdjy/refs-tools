import type { CandidateQuery } from '@refs-tools/contracts/organization-access'
import { DomainError } from '../../application/errors.js'
import { appendAudit } from '../audit/audit.service.js'
import { memberAccess } from './organization-members.access.js'
import type { AccessDependencies } from './organization-access.types.js'

/** 关键词最短长度；更短的输入几乎等于浏览全部账号，直接拒绝。 */
export const CANDIDATE_KEYWORD_MIN = 2

/** 邀请候选人检索：须有组织成员管理权限，每次检索写审计，但不记录关键词本身。 */
export class OrganizationCandidatesService {
  constructor(private readonly d: AccessDependencies) {}

  async search(actor: string, id: string, query: CandidateQuery) {
    const keyword = query.keyword.trim().toLowerCase()
    if (keyword.length < CANDIDATE_KEYWORD_MIN) throw new DomainError('KEYWORD_TOO_SHORT', '请至少输入 2 个字符', 422)
    const now = this.d.now()
    return this.d.transaction.run(async r => {
      await memberAccess(r, this.d, actor, id, now, 'manage')
      const result = await r.candidates.search(id, actor, keyword, Number(query.page ?? '1'), now)
      await appendAudit(r.audit, { actorUserId: actor, action: 'candidate.queried', resourceType: 'organization', resourceId: id,
        scopeType: 'organization', scopeId: id, organizationId: id, before: null, after: null, reason: null }, now)
      return result
    })
  }
}
