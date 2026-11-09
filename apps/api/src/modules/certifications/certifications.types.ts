import type { Certification, CertificationAppeal, CertificationHistory, CertificationScope, CertificationSummary, CertificationReviewSummary, CertificationStatus } from '@refs-tools/contracts/certifications'
import type { PageQuery, Paged } from '@refs-tools/contracts/pagination'
import type { TransactionRunner } from '../../application/transaction.js'
import type { AuthorizationRepository, PermissionEvaluator } from '../authorization/authorization.types.js'
import type { AuditRepository } from '../audit/audit.types.js'
import type { MediaRepository, ObjectStorage } from '../media/media.types.js'

export type CertificationFilter = { subjectUserId?: string; scope?: CertificationScope; queue?: boolean; appealQueue?: boolean; status?: CertificationStatus; records?: boolean }
export interface CertificationsRepository {
  /** 先取得轻量归属，再按组织 → 账号 → 认证顺序加锁，避免与成员操作反向锁定。 */
  locate(id: string): Promise<{ subjectUserId: string; scope: CertificationScope } | null>
  lockOrganization(id: string): Promise<{ active: boolean } | null>
  find(id: string): Promise<Certification | null>
  current(subject: string, scope: CertificationScope): Promise<Certification | null>
  insert(record: Certification, key: string, fingerprint: string): Promise<void>
  request(subject: string, key: string): Promise<{ id: string; fingerprint: string } | null>
  save(record: Certification, expectedVersion: number): Promise<boolean>
  list(filter: CertificationFilter, query: PageQuery): Promise<Paged<CertificationSummary>>
  reviewList(filter: CertificationFilter, query: PageQuery): Promise<Paged<CertificationReviewSummary>>
  prerequisiteOrganizations(subject: string): Promise<string[]>
  hasPrerequisite(subject: string, organizationIds: string[]): Promise<boolean>
  appendHistory(record: Certification, actor: string, action: string, now: string): Promise<void>
  history(id: string, query: PageQuery): Promise<Paged<CertificationHistory>>
  hasPendingAppeal(certificationId: string): Promise<boolean>
  insertAppeal(appeal: CertificationAppeal): Promise<boolean>
  appeal(certificationId: string, id: string): Promise<CertificationAppeal | null>
  saveAppeal(appeal: CertificationAppeal): Promise<boolean>
  appeals(certificationId: string, query: PageQuery): Promise<Paged<CertificationAppeal>>
  /** 认证模块拥有的最小只读关联投影；覆盖当前及历史证据和申诉材料。 */
  hasEvidence(id: string, mediaId: string, appealId?: string): Promise<boolean>
  mediaReferences(mediaId: string): Promise<Array<{ id: string; scope: CertificationScope; subjectUserId: string }>>
}
export type CertificationRepositories = {
  certifications: CertificationsRepository; authorization: AuthorizationRepository; audit: AuditRepository; media: MediaRepository
}
export type CertificationDependencies = {
  transaction: TransactionRunner<CertificationRepositories>; permissions: PermissionEvaluator; now: () => Date; storage?: ObjectStorage
}
