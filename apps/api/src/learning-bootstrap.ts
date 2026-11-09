import type { Pool } from 'pg'
import { createTransactionRunner } from './infrastructure/database/transaction.js'
import { PgAuditRepository } from './modules/audit/audit.repository.js'
import { PgAuthorizationRepository } from './modules/authorization/authorization.repository.js'
import type { PermissionEvaluator } from './modules/authorization/authorization.types.js'
import { PgMediaRepository } from './modules/media/media.repository.js'
import type { ObjectStorage } from './modules/media/media.types.js'
import { PgLearningRepository } from './modules/learning/learning.repository.js'
import { LearningService } from './modules/learning/learning.service.js'
import { LearningCategoriesService } from './modules/learning/learning-categories.service.js'
import { LearningPublishingService } from './modules/learning/learning-publishing.service.js'
import { LearningMediaService } from './modules/learning/learning-media.service.js'

/** 学习、实时授权、媒体核验与审计共享同一事务连接；存储只用于事务外短时签名。 */
export function buildLearningServices(pool: Pool, permissions: PermissionEvaluator, storage?: ObjectStorage) {
  const d = { transaction: createTransactionRunner(pool, client => ({ learning: new PgLearningRepository(client),
    media: new PgMediaRepository(client), authorization: new PgAuthorizationRepository(client), audit: new PgAuditRepository(client) })),
  permissions, now: () => new Date(), ...(storage ? { storage } : {}) }
  return { service: new LearningService(d), categories: new LearningCategoriesService(d),
    publishing: new LearningPublishingService(d), media: new LearningMediaService(d) }
}
