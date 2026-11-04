import type { Pool } from 'pg'
import { createTransactionRunner } from './infrastructure/database/transaction.js'
import { PgMediaRepository } from './modules/media/media.repository.js'
import { PgAuthorizationRepository } from './modules/authorization/authorization.repository.js'
import { PgAuditRepository } from './modules/audit/audit.repository.js'
import { MediaCompletionService } from './modules/media/media-completion.service.js'
import type { PermissionEvaluator } from './modules/authorization/authorization.types.js'
import { createOssStorage } from './providers/object-storage/oss.js'

/** 功能开关关闭时不创建 SDK；启用时配置缺失必须阻止启动。 */
export function buildMediaService(env: NodeJS.ProcessEnv, pool: Pool, permissions: PermissionEvaluator) {
  if (env['MEDIA_ENABLED'] && !['true', 'false'].includes(env['MEDIA_ENABLED'])) throw new Error('MEDIA_ENABLED must be true or false')
  if (env['MEDIA_ENABLED'] !== 'true') return null
  const secret = env['MEDIA_EVENT_SECRET']
  if (!secret || Buffer.byteLength(secret) < 32) throw new Error('MEDIA_EVENT_SECRET requires at least 32 bytes')
  const { storage, bucket } = createOssStorage(env)
  const service = new MediaCompletionService({
    transaction: createTransactionRunner(pool, (client) => ({
      media: new PgMediaRepository(client), authorization: new PgAuthorizationRepository(client), audit: new PgAuditRepository(client),
    })), storage, bucket, permissions, now: () => new Date(),
  })
  return { service, secret, now: () => new Date() }
}
