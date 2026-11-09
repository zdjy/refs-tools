import { DomainError } from '../../application/errors.js'
import { appendAudit } from '../audit/audit.service.js'
import { certificationHidden, lockCertification, requireCertificationReviewer } from './certifications.access.js'
import type { CertificationDependencies, CertificationRepositories } from './certifications.types.js'

/** 私有证据签名在事务外生成；返回前重新授权并原子写审计，拒绝返回已失权的链接。 */
export class CertificationEvidenceService {
  constructor(private readonly d: CertificationDependencies) {}

  async read(actor: string, id: string, mediaId: string, appealId?: string) {
    const media = await this.d.transaction.run(r => this.authorize(r, actor, id, mediaId, appealId))
    if (!this.d.storage) throw new DomainError('MEDIA_UNAVAILABLE', '文件访问暂不可用', 503)
    // 认证材料只允许图片/PDF，允许浏览器内联预览；通用与治理入口仍强制下载。
    const signed = await this.d.storage.signRead(media, 60, 'inline')
    await this.d.transaction.run(async r => {
      await this.authorize(r, actor, id, mediaId, appealId)
      const reference = await r.certifications.locate(id)
      await appendAudit(r.audit, { actorUserId: actor, action: 'media.read_authorized', resourceType: 'media', resourceId: mediaId,
        scopeType: reference!.scope.type, scopeId: reference!.scope.organizationId, organizationId: reference!.scope.organizationId,
        reason: null, before: null, after: null }, this.d.now())
    })
    return signed
  }

  private async authorize(r: CertificationRepositories, actor: string, id: string, mediaId: string, appealId?: string) {
    const record = await lockCertification(r, actor, id)
    if (appealId) {
      const appeal = await r.certifications.appeal(id, appealId)
      if (!appeal) throw certificationHidden()
      if (actor !== record.subjectUserId) {
        await requireCertificationReviewer(r, this.d, actor, record.scope, true)
        if (actor === appeal.originalReviewerId) throw new DomainError('APPEAL_REVIEWER_CONFLICT', '原审核人须回避申诉复核', 403)
      }
    } else if (actor !== record.subjectUserId) await requireCertificationReviewer(r, this.d, actor, record.scope)
    if (!await r.certifications.hasEvidence(id, mediaId, appealId)) throw certificationHidden()
    const media = await r.media.find(mediaId)
    if (!media || media.ownerUserId !== record.subjectUserId || media.purpose !== 'certification_evidence') throw certificationHidden()
    if (media.status !== 'available') throw new DomainError('MEDIA_NOT_AVAILABLE', '材料尚不可用', 409)
    return media
  }
}
