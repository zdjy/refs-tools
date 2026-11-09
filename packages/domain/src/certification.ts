import type { CertificationDecision, CertificationStatus } from '@refs-tools/contracts/certifications'

/** 认证级别不参与排序；人工审核状态转换按 FS-0001 §7.4，非法转换返回 null。 */
export function certificationStatusAfter(status: CertificationStatus, decision: CertificationDecision['decision']): CertificationStatus | null {
  if (status === 'under_review') {
    if (decision === 'approve') return 'approved'
    if (decision === 'reject') return 'rejected'
    if (decision === 'needs_more_information') return 'needs_more_information'
  }
  if (status === 'approved' && decision === 'suspend') return 'suspended'
  if (status === 'suspended' && decision === 'resume') return 'approved'
  if (['approved', 'suspended'].includes(status) && decision === 'revoke') return 'revoked'
  return null
}

/** 当前组织或成员失效时暂停已批准认证的效力；重入不恢复人工暂停或撤销记录。 */
export function effectiveCertificationStatus(status: CertificationStatus, organizationActive: boolean, memberActive: boolean): CertificationStatus {
  return status === 'approved' && (!organizationActive || !memberActive) ? 'suspended' : status
}
