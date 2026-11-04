import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { applyTestMigrations, createTestDatabase, type TestDatabase } from '../helpers/database.js'
import { createTransactionRunner } from '../../src/infrastructure/database/transaction.js'
import { PgMediaRepository } from '../../src/modules/media/media.repository.js'
import { PgAuditRepository } from '../../src/modules/audit/audit.repository.js'
import { PgAuthorizationRepository } from '../../src/modules/authorization/authorization.repository.js'
import { MediaCompletionService } from '../../src/modules/media/media-completion.service.js'
import { mediaHarness } from '../helpers/media.js'

let database: TestDatabase
beforeAll(async () => { database = await createTestDatabase(); await applyTestMigrations(database.pool) })
afterAll(async () => { await database?.close() })

describe('媒体真实 PostgreSQL 生命周期', () => {
  it('并发幂等创建、完成和删除保留一致状态，审计失败回滚逻辑删除', async () => {
    const h = mediaHarness()
    await database.pool.query("INSERT INTO users(id,email,display_name,email_verified_at) VALUES ($1,$2,'测试',now())", [h.actor, `${h.actor}@example.test`])
    const transaction = createTransactionRunner(database.pool, (connection) => ({
      media: new PgMediaRepository(connection), audit: new PgAuditRepository(connection), authorization: new PgAuthorizationRepository(connection),
    }))
    const service = new MediaCompletionService({ ...h.dependencies, transaction })
    const body = { purpose: 'forum_attachment' as const, contentType: 'image/jpeg', sizeBytes: 123 }
    const created = await Promise.all([service.create(h.actor, body, 'same'), service.create(h.actor, body, 'same')])
    expect(created[0]!.mediaId).toBe(created[1]!.mediaId)
    h.objects.set(created[0]!.objectKey, { sizeBytes: 123, contentType: 'image/jpeg', mediaId: created[0]!.mediaId, ownerUserId: h.actor, etag: 'verified' })
    const completed = await Promise.all([service.complete(h.actor, created[0]!.mediaId), service.complete(h.actor, created[0]!.mediaId)])
    expect(completed.map((m) => m.status)).toEqual(['available', 'available'])
    const failing = new MediaCompletionService({ ...h.dependencies, transaction: {
      run: (work) => transaction.run((repositories) => work({ ...repositories,
        audit: { ...repositories.audit, async append() { throw new Error('audit failure') }, list: (filter) => repositories.audit.list(filter) },
      })),
    } })
    await expect(failing.remove(h.actor, created[0]!.mediaId)).rejects.toThrow('audit failure')
    expect(await service.read(h.actor, created[0]!.mediaId)).toHaveProperty('url')
    await service.remove(h.actor, created[0]!.mediaId)
    await expect(service.read(h.actor, created[0]!.mediaId)).rejects.toMatchObject({ code: 'MEDIA_NOT_AVAILABLE' })
  })

  it('数据库 CHECK 拒绝未经核验的 available 状态', async () => {
    const h = mediaHarness()
    const media = new PgMediaRepository(database.pool)
    const id = randomUUID()
    await expect(database.pool.query(`INSERT INTO media_objects
      (id,owner_user_id,purpose,object_key,idempotency_key,request_fingerprint,target_type,target_id,declared_content_type,
       expected_size_bytes,status,expires_at,created_at) VALUES($1,$2,'forum_attachment',$3,'invalid','hash','self',$2,'image/jpeg',100,'available',now()+interval '1 hour',now())`,
    [id, h.actor, `media/${id}`])).rejects.toMatchObject({ code: '23514' })
    expect(await media.find(id)).toBeNull()
  })

  it('真实组织成员退出后下一次上传和读取拒绝，事件重放不复活删除对象', async () => {
    const h = mediaHarness()
    const org = randomUUID()
    const membership = randomUUID()
    await database.pool.query("INSERT INTO users(id,email,display_name,email_verified_at) VALUES ($1,$2,'测试',now())", [h.actor, `${h.actor}@example.test`])
    await database.pool.query("INSERT INTO organizations(id,owner_user_id,status) VALUES($1,$2,'active')", [org, h.actor])
    await database.pool.query("INSERT INTO organization_memberships(id,organization_id,user_id,status) VALUES($1,$2,$3,'active')", [membership, org, h.actor])
    const transaction = createTransactionRunner(database.pool, (connection) => ({
      media: new PgMediaRepository(connection), audit: new PgAuditRepository(connection), authorization: new PgAuthorizationRepository(connection),
    }))
    const service = new MediaCompletionService({ ...h.dependencies, transaction })
    const intent = await service.create(h.actor, { purpose: 'certification_evidence', target: { type: 'organization', id: org }, contentType: 'image/jpeg', sizeBytes: 123 }, 'scope')
    await database.pool.query("UPDATE organization_memberships SET status='left' WHERE id=$1", [membership])
    await expect(service.renew(h.actor, intent.mediaId)).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await database.pool.query("UPDATE organization_memberships SET status='active' WHERE id=$1", [membership])
    const event = { eventId: randomUUID(), mediaId: intent.mediaId, bucket: 'test-bucket', objectKey: intent.objectKey, type: 'ObjectCreated' as const }
    h.objects.set(intent.objectKey, { sizeBytes: 123, contentType: 'image/jpeg', mediaId: intent.mediaId, ownerUserId: h.actor, etag: 'verified' })
    await service.providerEvent(event)
    await service.providerEvent(event)
    expect(await service.complete(h.actor, intent.mediaId)).toMatchObject({ status: 'available' })
    await database.pool.query("UPDATE organization_memberships SET status='left' WHERE id=$1", [membership])
    await expect(service.read(h.actor, intent.mediaId)).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
