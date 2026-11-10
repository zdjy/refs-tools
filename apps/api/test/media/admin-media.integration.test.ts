import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { applyTestMigrations, createTestDatabase, type TestDatabase } from '../helpers/database.js'
import { mediaHarness } from '../helpers/media.js'
import { createTransactionRunner } from '../../src/infrastructure/database/transaction.js'
import { PgMediaRepository } from '../../src/modules/media/media.repository.js'
import { PgAdminMediaRepository } from '../../src/modules/media/admin-media.repository.js'
import { PgAuthorizationRepository } from '../../src/modules/authorization/authorization.repository.js'
import { PgAuditRepository } from '../../src/modules/audit/audit.repository.js'
import { AdminMediaService } from '../../src/modules/media/admin-media.service.js'
import { MediaCompletionService } from '../../src/modules/media/media-completion.service.js'

let database: TestDatabase
beforeAll(async () => { database = await createTestDatabase(); await applyTestMigrations(database.pool) })
afterAll(async () => { await database?.close() })

async function fixture() {
  const h = mediaHarness(), admin = randomUUID()
  await database.pool.query("INSERT INTO users(id,email,display_name,email_verified_at) VALUES($1,$2,'裁判甲',now())", [h.actor, `${h.actor}@example.test`])
  await database.pool.query("INSERT INTO users(id,email,display_name,email_verified_at) VALUES($1,$2,'管理员乙',now())", [admin, `${admin}@example.test`])
  await database.pool.query("INSERT INTO referee_profiles(user_id,legal_name) VALUES($1,'张三')", [h.actor])
  await database.pool.query("INSERT INTO role_bindings(id,subject_user_id,role,scope_type,scope_id,granted_by,starts_at) VALUES($1,$2,'platform_admin','platform',NULL,$2,'2026-01-01')", [randomUUID(), admin])
  const transaction = createTransactionRunner(database.pool, connection => ({
    media: new PgMediaRepository(connection), adminMedia: new PgAdminMediaRepository(connection),
    authorization: new PgAuthorizationRepository(connection), audit: new PgAuditRepository(connection),
  }))
  const dependencies = { ...h.dependencies, transaction }
  const media = new MediaCompletionService(dependencies)
  const intent = await media.create(h.actor, { purpose: 'forum_attachment', fileName: 'literal_%文件.jpg', contentType: 'image/jpeg', sizeBytes: 123 }, 'db-file')
  h.objects.set(intent.objectKey, { sizeBytes: 123, contentType: 'image/jpeg', mediaId: intent.mediaId, ownerUserId: h.actor, etag: 'trusted' })
  await media.complete(h.actor, intent.mediaId)
  return { h, admin, transaction, dependencies, intent, service: new AdminMediaService(dependencies) }
}

describe('管理文件真实 PostgreSQL', () => {
  it('分页筛选、字面文件名、按昵称/实名检索归属、最小投影和时间/字节映射准确', async () => {
    const f = await fixture()
    const result = await f.service.list(f.admin, { keyword: '_%', ownerKeyword: '裁判甲', purpose: 'forum_attachment', status: 'available' })
    expect(result.total).toBe(1); expect(result.items[0]).toMatchObject({ id: f.intent.mediaId, expectedSizeBytes: 123, verifiedSizeBytes: 123, fileName: 'literal_%文件.jpg', ownerDisplayName: '裁判甲' })
    expect(result.items[0]).not.toHaveProperty('objectKey'); expect(result.items[0]!.verifiedAt).not.toBeNull()
    expect((await f.service.list(f.admin, { ownerKeyword: '裁判甲', page: '2' })).items).toEqual([])
    // 实名只参与匹配，不进入响应；昵称不匹配时不能再按 UUID 检索。
    expect((await f.service.list(f.admin, { ownerKeyword: ' 张三 ' })).total).toBe(1)
    expect((await f.service.list(f.admin, { ownerKeyword: '管理员' })).total).toBe(0)
    expect((await f.service.list(f.admin, { ownerKeyword: f.h.actor })).total).toBe(0)
    expect(JSON.stringify(await f.service.list(f.admin, { ownerKeyword: '张三' }))).not.toContain('张三')
    const detail = await f.service.detail(f.admin, f.intent.mediaId)
    expect(detail.target).toEqual({ type: 'self', id: f.h.actor }); expect(detail.ownerDisplayName).toBe('裁判甲')
    const audits = await database.pool.query("SELECT action FROM audit_events WHERE actor_user_id=$1 AND action='media.queried'", [f.admin])
    expect(audits.rowCount).toBe(7)
  })
  it('审计失败回滚删除且存储不执行，成功删除幂等，真实撤权立即拒绝', async () => {
    const f = await fixture()
    const failing = new AdminMediaService({ ...f.dependencies, transaction: { run: work => f.transaction.run(repositories => work({ ...repositories,
      audit: { append: async () => { throw new Error('audit failure') }, list: filter => repositories.audit.list(filter) },
    })) } })
    await expect(failing.remove(f.admin, f.intent.mediaId, { reason: '核对' })).rejects.toThrow('audit failure')
    expect((await f.service.detail(f.admin, f.intent.mediaId)).status).toBe('available'); expect(f.h.objects.has(f.intent.objectKey)).toBe(true)
    await f.service.remove(f.admin, f.intent.mediaId, { reason: '违规' }); await f.service.remove(f.admin, f.intent.mediaId, { reason: '重试' })
    const current = await f.service.detail(f.admin, f.intent.mediaId)
    expect(current.status).toBe('deleted'); expect(current.deletedAt).not.toBeNull(); expect(f.h.objects.has(f.intent.objectKey)).toBe(false)
    await database.pool.query('UPDATE role_bindings SET revoked_at=now() WHERE subject_user_id=$1', [f.admin])
    await expect(f.service.list(f.admin, {})).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(f.service.remove(f.admin, f.intent.mediaId, { reason: '重试' })).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
})
