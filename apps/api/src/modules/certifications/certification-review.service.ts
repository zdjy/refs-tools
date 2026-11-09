import type { CertificationDecision, CertificationScope } from '@refs-tools/contracts/certifications'
import { certificationStatusAfter } from '@refs-tools/domain'
import { DomainError } from '../../application/errors.js'
import { requirePermission } from '../authorization/authorization.service.js'
import { lockCertification, requireCertificationReviewer, requireCertificationVersion, saveCertification } from './certifications.access.js'
import type { CertificationDependencies } from './certifications.types.js'

/** 人工审核、暂停及撤销只影响当前范围；申请人不得处理自己的记录。 */
export class CertificationReviewService {
  constructor(private readonly d: CertificationDependencies) {}

  async decide(actor: string, id: string, scope: CertificationScope, input: CertificationDecision) {
    return this.d.transaction.run(async r => {
      const before = await lockCertification(r, actor, id)
      if (before.scope.type !== scope.type || before.scope.organizationId !== scope.organizationId) {
        throw new DomainError('NOT_FOUND', '认证记录不存在', 404)
      }
      if (input.decision === 'revoke' && scope.type === 'organization') {
        await requirePermission(r.authorization, { subjectUserId: actor, permission: 'organization.certification.revoke',
          resource: { type: 'organization', id: scope.organizationId } }, this.d.now(), this.d.permissions)
      } else await requireCertificationReviewer(r, this.d, actor, scope)
      if (actor === before.subjectUserId) throw new DomainError('CERTIFICATION_SELF_REVIEW', '不能审核本人认证', 403)
      requireCertificationVersion(before, input.expectedVersion)
      if (await r.certifications.hasPendingAppeal(id)) throw new DomainError('APPEAL_PENDING', '请先完成待处理申诉', 409)
      if (scope.type === 'organization' && !['revoke', 'suspend'].includes(input.decision)
        && !await r.authorization.isActiveMember(before.subjectUserId, scope.organizationId)) {
        throw new DomainError('CERTIFICATION_MEMBERSHIP_REQUIRED', '申请人已不是正式成员', 422)
      }
      const status = certificationStatusAfter(before.status, input.decision)
      if (!status) throw new DomainError('INVALID_CERTIFICATION_STATE', '当前认证状态不允许此决定', 409)
      const now = this.d.now().toISOString()
      return saveCertification(r, this.d, actor, before, { ...before, status, effectiveStatus: status,
        reviewedBy: actor, reviewedAt: now, reviewNote: input.reason.trim(), updatedAt: now, version: before.version + 1 },
      status === 'revoked' ? 'certification.revoked' : 'certification.decided', input.reason.trim())
    })
  }
}
