import { randomUUID } from 'node:crypto'
import type { CertificationAppeal, CertificationAppealDecision, CreateCertificationAppeal } from '@refs-tools/contracts/certifications'
import type { PageQuery } from '@refs-tools/contracts/pagination'
import { DomainError } from '../../application/errors.js'
import { certificationHidden, lockCertification, requireCertificationMedia, requireCertificationReviewer,
  requireCertificationVersion, saveCertification, certificationAudit } from './certifications.access.js'
import type { CertificationDependencies } from './certifications.types.js'

/** 申诉状态与认证效力独立；组织复核由当前负责人承担，平台复核由另一位平台管理员承担。 */
export class CertificationAppealsService {
  constructor(private readonly d: CertificationDependencies) {}

  async create(actor: string, id: string, input: CreateCertificationAppeal) {
    return this.d.transaction.run(async r => {
      const before = await lockCertification(r, actor, id)
      if (before.subjectUserId !== actor) throw certificationHidden()
      requireCertificationVersion(before, input.expectedVersion)
      if (!['rejected', 'revoked'].includes(before.status)) throw new DomainError('INVALID_CERTIFICATION_STATE', '仅驳回或撤销结果可申诉', 409)
      if (before.scope.type === 'organization' && !(await r.certifications.lockOrganization(before.scope.organizationId))?.active) {
        throw new DomainError('ORGANIZATION_INACTIVE', '组织当前只读，暂不可提交申诉', 409)
      }
      await requireCertificationMedia(r, actor, before.scope, input.evidenceMediaIds)
      const appeal: CertificationAppeal = { id: randomUUID(), certificationId: id, appellantId: actor, reason: input.reason.trim(),
        evidenceMediaIds: input.evidenceMediaIds, status: 'pending', originalReviewerId: before.reviewedBy,
        reviewerId: null, decision: null, reviewReason: null, createdAt: this.d.now().toISOString(), decidedAt: null }
      if (!await r.certifications.insertAppeal(appeal)) throw new DomainError('APPEAL_PENDING', '已有待处理申诉', 409)
      await saveCertification(r, this.d, actor, before, { ...before, version: before.version + 1,
        updatedAt: this.d.now().toISOString() }, 'certification.appealed', input.reason.trim())
      return appeal
    })
  }

  async list(actor: string, id: string, query: PageQuery) {
    return this.d.transaction.run(async r => {
      const record = await lockCertification(r, actor, id)
      if (record.subjectUserId !== actor) await requireCertificationReviewer(r, this.d, actor, record.scope, true)
      const result = await r.certifications.appeals(id, query)
      await certificationAudit(r, this.d, actor, record, null, 'certification.queried')
      return result
    })
  }

  async application(actor: string, id: string, appealId: string) {
    return this.d.transaction.run(async r => {
      const record = await lockCertification(r, actor, id)
      const appeal = await r.certifications.appeal(id, appealId)
      if (!appeal) throw certificationHidden()
      if (actor !== record.subjectUserId) {
        await requireCertificationReviewer(r, this.d, actor, record.scope, true)
        if (actor === appeal.originalReviewerId) throw new DomainError('APPEAL_REVIEWER_CONFLICT', '原审核人须回避申诉复核', 403)
      }
      await certificationAudit(r, this.d, actor, record, null, 'certification.queried')
      return record
    })
  }

  async decide(actor: string, id: string, appealId: string, input: CertificationAppealDecision) {
    return this.d.transaction.run(async r => {
      const before = await lockCertification(r, actor, id)
      await requireCertificationReviewer(r, this.d, actor, before.scope, true)
      requireCertificationVersion(before, input.expectedVersion)
      const appeal = await r.certifications.appeal(id, appealId)
      if (!appeal) throw certificationHidden()
      if (actor === appeal.originalReviewerId || actor === appeal.appellantId) {
        throw new DomainError('APPEAL_REVIEWER_CONFLICT', '申诉须由非原审核人且非申请人复核', 403)
      }
      if (appeal.status !== 'pending') throw new DomainError('APPEAL_CLOSED', '申诉已处理', 409)
      const status = input.decision === 'overturn' ? 'approved'
        : input.decision === 'needs_more_information' ? 'needs_more_information' : before.status
      if (status === 'approved' && before.scope.type === 'organization'
        && !await r.authorization.isActiveMember(before.subjectUserId, before.scope.organizationId)) {
        throw new DomainError('CERTIFICATION_MEMBERSHIP_REQUIRED', '申请人已不是正式成员', 422)
      }
      const now = this.d.now().toISOString()
      if (!await r.certifications.saveAppeal({ ...appeal, status: 'decided', reviewerId: actor,
        decision: input.decision, reviewReason: input.reason.trim(), decidedAt: now })) throw new DomainError('APPEAL_CLOSED', '申诉已处理', 409)
      await saveCertification(r, this.d, actor, before, { ...before, status, effectiveStatus: status,
        reviewedBy: actor, reviewedAt: now, reviewNote: input.reason.trim(), version: before.version + 1, updatedAt: now },
      'certification.decided', input.reason.trim())
      return (await r.certifications.appeal(id, appealId))!
    })
  }
}
