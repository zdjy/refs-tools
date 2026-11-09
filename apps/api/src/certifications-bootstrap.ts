import type { Pool } from 'pg'
import { createTransactionRunner } from './infrastructure/database/transaction.js'
import { PgAuditRepository } from './modules/audit/audit.repository.js'
import { PgAuthorizationRepository } from './modules/authorization/authorization.repository.js'
import type { PermissionEvaluator } from './modules/authorization/authorization.types.js'
import { PgMediaRepository } from './modules/media/media.repository.js'
import type { ObjectStorage } from './modules/media/media.types.js'
import { PgCertificationsRepository } from './modules/certifications/certifications.repository.js'
import { CertificationsService } from './modules/certifications/certifications.service.js'
import { CertificationReviewService } from './modules/certifications/certification-review.service.js'
import { CertificationAppealsService } from './modules/certifications/certification-appeals.service.js'
import { CertificationEvidenceService } from './modules/certifications/certification-evidence.service.js'

/** 认证的业务、授权与审计 Repository 始终绑定同一事务连接。 */
export function buildCertificationServices(pool: Pool, permissions: PermissionEvaluator, storage?: ObjectStorage) {
  const d = { transaction: createTransactionRunner(pool, client => ({ certifications: new PgCertificationsRepository(client),
    media: new PgMediaRepository(client), authorization: new PgAuthorizationRepository(client), audit: new PgAuditRepository(client) })),
  permissions, now: () => new Date(), ...(storage ? { storage } : {}) }
  return { service: new CertificationsService(d), review: new CertificationReviewService(d),
    appeals: new CertificationAppealsService(d), evidence: new CertificationEvidenceService(d) }
}
