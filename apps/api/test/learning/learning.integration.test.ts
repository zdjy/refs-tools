import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { applyTestMigrations, createTestDatabase, type TestDatabase } from '../helpers/database.js'
import { seedAuthorization } from '../helpers/authorization.js'
import { buildLearningServices } from '../../src/learning-bootstrap.js'
import { PgLearningRepository } from '../../src/modules/learning/learning.repository.js'
import { withTransaction } from '../../src/infrastructure/database/transaction.js'
import type { LearningContent, LearningCategory } from '@refs-tools/contracts/learning'

describe.skipIf(!process.env['TEST_DATABASE_URL'])('学习 PostgreSQL', () => {
  let db: TestDatabase, seed: Awaited<ReturnType<typeof seedAuthorization>>, services: ReturnType<typeof buildLearningServices>
  let input: LearningContent
  beforeAll(async () => { db = await createTestDatabase() })
  afterAll(async () => { await db?.close() })
  beforeEach(async () => {
    await db.reset(); await applyTestMigrations(db.pool); seed = await seedAuthorization(db.pool)
    await db.pool.query(`INSERT INTO role_bindings(id,subject_user_id,role,scope_type,granted_by,starts_at)
      VALUES($1,$2,'content_editor','platform',$2,'2026-11-01')`, [randomUUID(), seed.ids.actor])
    services = buildLearningServices(db.pool, seed.permissions)
    input = { title: '规则导读', summary: '资料概要', body: [{ text: '正文内容' }], categoryIds: [], mediaIds: [], allowDownload: false }
  })
  async function category(parentId: string | null = null): Promise<LearningCategory> {
    return services.categories.create(seed.ids.admin, { name: '规则', slug: `rules-${randomUUID()}`, parentId, status: 'active' }, randomUUID())
  }
  async function media() {
    const id = randomUUID()
    await db.pool.query(`INSERT INTO media_objects(id,owner_user_id,purpose,object_key,target_type,target_id,declared_content_type,
      expected_size_bytes,verified_size_bytes,etag,status,expires_at,created_at,verified_at,idempotency_key,request_fingerprint)
      VALUES($1::uuid,$2,'learning',$1::text,'platform',NULL,'application/pdf',10,10,'e','available','2027-01-01','2026-11-01','2026-11-01',$1::text,'f')`, [id, seed.ids.actor])
    return id
  }
  it('三级约束、子树移动、环与 slug 冲突；数据库拒绝直接写第四层和不一致的后代深度', async () => {
    const root = await category(), child = await category(root.id), leaf = await category(child.id), other = await category()
    const categoryInput = { parentId: null, name: '重放', slug: 'replayed', status: 'active' as const }
    const replay = await services.categories.create(seed.ids.admin, categoryInput, 'category-replay')
    expect((await services.categories.create(seed.ids.admin, categoryInput, 'category-replay')).id).toBe(replay.id)
    await expect(services.categories.create(seed.ids.admin, { ...categoryInput, name: '不同内容' }, 'category-replay')).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' })
    await expect(category(leaf.id)).rejects.toMatchObject({ code: 'LEARNING_CATEGORY_DEPTH' })
    await expect(services.categories.update(seed.ids.admin, root.id, { parentId: leaf.id, name: root.name, slug: root.slug, status: 'active', expectedRevision: 1 })).rejects.toMatchObject({ code: 'LEARNING_CATEGORY_DEPTH' })
    await expect(services.categories.update(seed.ids.admin, root.id, { parentId: other.id, name: root.name, slug: root.slug, status: 'active', expectedRevision: 1 })).rejects.toMatchObject({ code: 'LEARNING_CATEGORY_DEPTH' })
    await services.categories.update(seed.ids.admin, child.id, { parentId: null, name: child.name, slug: child.slug, status: 'active', expectedRevision: 1 })
    expect((await new PgLearningRepository(db.pool).category(leaf.id))?.depth).toBe(2)
    await expect(db.pool.query("UPDATE learning_categories SET depth=3 WHERE id=$1", [leaf.id])).rejects.toThrow('invalid category depth')
    await expect(db.pool.query("INSERT INTO learning_categories(id,parent_id,name,slug,depth,status,created_by,idempotency_key,request_fingerprint) VALUES($1,$2,'four','four',4,'active',$3,'four','f')", [randomUUID(), leaf.id, seed.ids.admin])).rejects.toThrow()
    await expect(services.categories.create(seed.ids.admin, { parentId: null, name: root.name, slug: root.slug, status: 'active' }, 'duplicate')).rejects.toMatchObject({ code: 'LEARNING_CATEGORY_CONFLICT' })
    await expect(withTransaction(db.pool, async client => {
      await client.query('UPDATE learning_categories SET parent_id=$2,depth=2 WHERE id=$1', [child.id, root.id])
    })).rejects.toThrow('invalid descendant depth')
  })
  it('多分类筛选和停用保留历史；新草稿不影响发布版本，下线保留快照和媒体', async () => {
    const one = await category(), two = await category(), mediaId = await media()
    const created = await services.service.create(seed.ids.actor, { ...input, categoryIds: [one.id, two.id], mediaIds: [mediaId] }, 'asset')
    const id = created.asset.id
    await services.publishing.publish(seed.ids.actor, id, 1, 1)
    await services.service.revise(seed.ids.actor, id, { ...input, title: '新修订', expectedRevision: 2 })
    expect((await services.service.detail(seed.ids.outsider, id)).content.title).toBe(input.title)
    for (const categoryId of [one.id, two.id]) expect((await services.service.list(seed.ids.outsider, { categoryId })).total).toBe(1)
    await services.categories.update(seed.ids.admin, one.id, { parentId: null, name: one.name, slug: one.slug, status: 'disabled', expectedRevision: 1 })
    expect((await services.service.list(seed.ids.outsider, { categoryId: one.id })).total).toBe(0)
    expect((await services.service.snapshot(seed.ids.actor, id, 1)).categoryIds).toContain(one.id)
    await services.publishing.unpublish(seed.ids.admin, id, 3)
    await expect(services.service.detail(seed.ids.outsider, id)).rejects.toMatchObject({ statusCode: 404 })
    expect((await services.service.snapshot(seed.ids.actor, id, 1)).mediaIds).toEqual([mediaId])
    expect((await db.pool.query('SELECT asset_version FROM learning_publications WHERE asset_id=$1', [id])).rows).toEqual([{ asset_version: 1 }])
    await expect(db.pool.query('UPDATE learning_publications SET asset_version=2 WHERE asset_id=$1', [id])).rejects.toThrow()
    await expect(db.pool.query('UPDATE learning_asset_versions SET title=$1 WHERE asset_id=$2', ['篡改', id])).rejects.toThrow()
    await expect(db.pool.query('DELETE FROM learning_asset_media WHERE asset_id=$1', [id])).rejects.toThrow()
    await expect(db.pool.query("UPDATE media_objects SET status='deleted' WHERE id=$1", [mediaId])).rejects.toThrow('learning media retained')
    const audits = JSON.stringify((await db.pool.query('SELECT before,after,reason FROM audit_events')).rows)
    expect(audits).not.toContain(input.title); expect(audits).not.toContain('https://')
  })
  it('并发同键创建只产生一个资料；并发发布只有一个成功，撤权立即生效', async () => {
    const results = await Promise.all([services.service.create(seed.ids.actor, input, 'same'), services.service.create(seed.ids.actor, input, 'same')])
    const id = results[0]!.asset.id
    expect(results[1]!.asset.id).toBe(id)
    const publishing = await Promise.allSettled([services.publishing.publish(seed.ids.actor, id, 1, 1), services.publishing.publish(seed.ids.actor, id, 1, 1)])
    expect(publishing.filter(r => r.status === 'fulfilled')).toHaveLength(1)
    await db.pool.query("UPDATE role_bindings SET revoked_at=now() WHERE subject_user_id=$1 AND role='content_editor'", [seed.ids.actor])
    await expect(services.service.revise(seed.ids.actor, id, { ...input, expectedRevision: 2 })).rejects.toMatchObject({ statusCode: 403 })
    await expect(services.service.snapshot(seed.ids.outsider, id, 1)).rejects.toMatchObject({ statusCode: 403 })
  })
  it('分页全序、空页和参数筛选；审计失败原子回滚发布', async () => {
    const created = await services.service.create(seed.ids.actor, input, 'one')
    await db.pool.query(`CREATE FUNCTION fail_learning_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.action='learning.published' THEN RAISE EXCEPTION 'audit failure'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER fail_learning_audit BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION fail_learning_audit()`)
    await expect(services.publishing.publish(seed.ids.actor, created.asset.id, 1, 1)).rejects.toThrow('audit failure')
    expect((await services.service.detail(seed.ids.actor, created.asset.id, true)).asset.status).toBe('draft')
    expect(await services.service.list(seed.ids.actor, { q: '规则', page: '2', pageSize: '10' }, true)).toMatchObject({ total: 1, items: [], page: 2, pageSize: 10 })
    expect((await services.service.list(seed.ids.actor, { q: "' OR 1=1 --" }, true)).total).toBe(0)
  })
  it('引用表不能给旧快照事后增加媒体，认证证据不能借作学习文件', async () => {
    const created = await services.service.create(seed.ids.actor, input, 'references'), mediaId = await media()
    await expect(db.pool.query('INSERT INTO learning_asset_media(asset_id,asset_version,media_id) VALUES($1,1,$2)', [created.asset.id, mediaId])).rejects.toThrow('reference outside snapshot')
    await db.pool.query("UPDATE media_objects SET purpose='certification_evidence',target_type='self',target_id=$2 WHERE id=$1", [mediaId, seed.ids.actor])
    await expect(services.service.create(seed.ids.actor, { ...input, mediaIds: [mediaId] }, 'invalid')).rejects.toMatchObject({ code: 'LEARNING_MEDIA_INVALID' })
  })
})
