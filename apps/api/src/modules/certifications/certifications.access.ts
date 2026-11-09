import type { AuditAction } from '@refs-tools/contracts/audit'
import type { Certification, CertificationScope, CertificationStatus } from '@refs-tools/contracts/certifications'
import { DomainError } from '../../application/errors.js'
import { appendAudit } from '../audit/audit.service.js'
import { requirePermission } from '../authorization/authorization.service.js'
import type { Permission } from '@refs-tools/domain'
import type { CertificationDependencies, CertificationRepositories } from './certifications.types.js'

/** 错误目标和不可见记录共用 404，避免申请及证据枚举。 */
export function certificationHidden() { return new DomainError('NOT_FOUND', '认证记录不存在', 404) }

/** 在组织锁之后读取账号，所有认证写入与成员变更共享锁顺序。 */
export async function certificationAccount(r: CertificationRepositories, actor: string) {
  const account = await r.media.lockAccount(actor)
  if (!account) throw new DomainError('UNAUTHENTICATED', '请重新登录', 401)
  if (!account.verified) throw new DomainError('EMAIL_NOT_VERIFIED', '请先验证邮箱', 403)
}

/** 轻量定位不作为授权结论；加锁后重新读取真实记录。 */
export async function lockCertification(r: CertificationRepositories, actor: string, id: string, prerequisiteOrganizations: string[] = []) {
  const reference = await r.certifications.locate(id)
  if (!reference) throw certificationHidden()
  if (reference.scope.type === 'organization') await r.certifications.lockOrganization(reference.scope.organizationId)
  else prerequisiteOrganizations.push(...await lockPrerequisiteOrganizations(r, reference.subjectUserId))
  for (const account of [...new Set([actor, reference.subjectUserId])].sort()) await certificationAccount(r, account)
  const record = await r.certifications.find(id)
  if (!record) throw certificationHidden()
  return record
}

/** 平台用例在账号锁前按组织 ID 加锁，和组织认证、成员变更保持相同顺序。 */
export async function lockPrerequisiteOrganizations(r: CertificationRepositories, subject: string) {
  const ids = await r.certifications.prerequisiteOrganizations(subject)
  for (const id of ids) await r.certifications.lockOrganization(id)
  return ids
}

/** 组织认证写入要求当前成员；平台申请的组织推荐条件在创建和提交时分别重验。 */
export async function requireCertificationSubject(r: CertificationRepositories, subject: string, scope: CertificationScope, prerequisiteOrganizations: string[] = []) {
  if (scope.type === 'organization') {
    const organization = await r.certifications.lockOrganization(scope.organizationId)
    if (!organization?.active || !await r.authorization.isActiveMember(subject, scope.organizationId)) {
      throw new DomainError('CERTIFICATION_MEMBERSHIP_REQUIRED', '须为已启用组织的正式成员', 422)
    }
  } else if (!await r.certifications.hasPrerequisite(subject, prerequisiteOrganizations)) {
    throw new DomainError('CERTIFICATION_PREREQUISITE_REQUIRED', '须持有当前有效的组织认证及成员关系', 422)
  }
}

/** 审核与原件读取只使用认证实际 scope；平台身份不覆盖组织认证。 */
export async function requireCertificationReviewer(r: CertificationRepositories, d: CertificationDependencies,
  actor: string, scope: CertificationScope, elevated = false) {
  const permission: Permission = scope.type === 'platform' ? 'platform.certification.review'
    : elevated ? 'organization.manage' : 'organization.certification.review'
  await requirePermission(r.authorization, { subjectUserId: actor, permission,
    resource: { type: scope.type, id: scope.organizationId } }, d.now(), d.permissions)
}

/** 原件不得跨申请人或跨 scope 借用；同范围补件可以复用既有可用证据。 */
export async function requireCertificationMedia(r: CertificationRepositories, subject: string, scope: CertificationScope, ids: string[]) {
  for (const id of [...new Set(ids)].sort()) {
    const media = await r.media.find(id)
    if (!media || media.ownerUserId !== subject || media.purpose !== 'certification_evidence' || media.status !== 'available'
      || !(media.target.type === 'self' || (scope.type === 'organization' && media.target.type === 'organization' && media.target.id === scope.organizationId))) {
      throw new DomainError('CERTIFICATION_EVIDENCE_INVALID', '材料须为本人已核验的认证专用文件且属于当前范围', 422)
    }
    const references = await r.certifications.mediaReferences(id)
    if (references.some(ref => ref.scope.type !== scope.type || ref.scope.organizationId !== scope.organizationId)) {
      throw new DomainError('CERTIFICATION_EVIDENCE_SCOPE_CONFLICT', '不同认证范围请分别上传材料', 422)
    }
  }
}

/** expectedVersion 保护所有编辑、审核及申诉，不静默覆盖已提交的结果。 */
export function requireCertificationVersion(record: Certification, version: number) {
  if (record.version !== version) throw new DomainError('VERSION_CONFLICT', '记录已更新，请重新读取', 409)
}

/** 历史快照与业务记录、审计同事务；敏感证书字段仅进入受控历史，不复制到审计。 */
export async function saveCertification(r: CertificationRepositories, d: CertificationDependencies, actor: string,
  before: Certification, after: Certification, action: AuditAction, reason: string | null = null) {
  if (!await r.certifications.save(after, before.version)) throw new DomainError('VERSION_CONFLICT', '记录已更新，请重新读取', 409)
  await r.certifications.appendHistory(after, actor, action, d.now().toISOString())
  await certificationAudit(r, d, actor, after, before.status, action, reason)
  return after
}

/** 认证相关审计统一最小状态/版本投影；reason 仍受共享审计白名单约束。 */
export async function certificationAudit(r: CertificationRepositories, d: CertificationDependencies, actor: string,
  record: Certification, previous: CertificationStatus | null, action: AuditAction, reason: string | null = null) {
  await appendAudit(r.audit, { actorUserId: actor, action, resourceType: 'certification', resourceId: record.id,
    scopeType: record.scope.type, scopeId: record.scope.organizationId, organizationId: record.scope.organizationId, reason,
    before: previous ? { status: previous, version: Math.max(1, record.version - 1) } : null,
    after: { status: record.status, version: record.version, subjectUserId: record.subjectUserId } }, d.now())
}
