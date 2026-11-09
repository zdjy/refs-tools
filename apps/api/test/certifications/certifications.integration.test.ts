import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { CreateCertification } from '@refs-tools/contracts/certifications'
import { applyTestMigrations, createTestDatabase, type TestDatabase } from '../helpers/database.js'
import { seedAuthorization } from '../helpers/authorization.js'
import { createTransactionRunner } from '../../src/infrastructure/database/transaction.js'
import { PgCertificationsRepository } from '../../src/modules/certifications/certifications.repository.js'
import { CertificationsService } from '../../src/modules/certifications/certifications.service.js'
import { CertificationReviewService } from '../../src/modules/certifications/certification-review.service.js'
import { CertificationAppealsService } from '../../src/modules/certifications/certification-appeals.service.js'
import { CertificationEvidenceService } from '../../src/modules/certifications/certification-evidence.service.js'
import { PgAuthorizationRepository } from '../../src/modules/authorization/authorization.repository.js'
import { PgAuditRepository } from '../../src/modules/audit/audit.repository.js'
import { PgMediaRepository } from '../../src/modules/media/media.repository.js'
import { withTransaction } from '../../src/infrastructure/database/transaction.js'
import { mediaHarness } from '../helpers/media.js'

describe.skipIf(!process.env['TEST_DATABASE_URL'])('认证 PostgreSQL', () => {
  let db: TestDatabase, seed: Awaited<ReturnType<typeof seedAuthorization>>, service: CertificationsService
  let review: CertificationReviewService, appeals: CertificationAppealsService, evidence: CertificationEvidenceService, input: CreateCertification
  beforeAll(async () => { db = await createTestDatabase() })
  afterAll(async () => { await db?.close() })
  beforeEach(async () => {
    await db.reset(); await applyTestMigrations(db.pool); seed = await seedAuthorization(db.pool)
    await db.pool.query(`INSERT INTO role_bindings(id,subject_user_id,role,scope_type,scope_id,granted_by,starts_at)
      VALUES($1,$2,'certifier','organization',$3,$2,'2026-11-01')`, [randomUUID(), seed.ids.owner, seed.ids.orgA])
    const d = { transaction: createTransactionRunner(db.pool, client => ({ certifications: new PgCertificationsRepository(client),
      authorization: new PgAuthorizationRepository(client), audit: new PgAuditRepository(client), media: new PgMediaRepository(client) })),
    permissions: seed.permissions, now: seed.now, storage: mediaHarness().dependencies.storage }
    service = new CertificationsService(d); review = new CertificationReviewService(d)
    appeals = new CertificationAppealsService(d); evidence = new CertificationEvidenceService(d)
    input = { scope: { type: 'organization', organizationId: seed.ids.orgA }, level: 'national', certificateNumber: '私有编号-123', issuer: '省协会',
      obtainedAt: '2025-01-01', evidenceMediaIds: [await media()], historyMediaIds: [await media()], statement: '私人履历' }
  })
  async function media() {
    const id = randomUUID()
    await db.pool.query(`INSERT INTO media_objects(id,owner_user_id,purpose,object_key,target_type,target_id,declared_content_type,
      expected_size_bytes,verified_size_bytes,etag,status,expires_at,created_at,verified_at,idempotency_key,request_fingerprint)
      VALUES($1::uuid,$2,'certification_evidence',$1::text,'self',$2,'image/jpeg',10,10,'e','available','2027-01-01','2026-11-01','2026-11-01',$1::text,'f')`, [id, seed.ids.actor])
    return id
  }
  async function submitted() {
    const record = await service.create(seed.ids.actor, input, 'create')
    return service.submit(seed.ids.actor, record.id, 1)
  }
  async function approved() {
    const record = await submitted()
    return review.decide(seed.ids.owner, record.id, input.scope, { decision: 'approve', expectedVersion: 2, reason: '已核对字段原件与履历' })
  }
  it('材料与决定形成不可变历史，摘要不含证书字段；跨组织与平台角色不可读取组织原件', async () => {
    const record = await approved()
    expect((await service.mine(seed.ids.actor, {})).items[0]).not.toHaveProperty('certificateNumber')
    expect((await service.history(seed.ids.actor, record.id, {})).items.map(h => h.record.version)).toEqual([3, 2, 1])
    expect((await service.queue(seed.ids.owner, input.scope, {})).items).toEqual([])
    await expect(review.decide(seed.ids.owner, record.id, { type: 'organization', organizationId: seed.ids.orgB },
      { decision: 'revoke', expectedVersion: 3, reason: '跨组织' })).rejects.toMatchObject({ statusCode: 404 })
    await expect(evidence.read(seed.ids.admin, record.id, input.evidenceMediaIds[0]!)).rejects.toMatchObject({ statusCode: 404 })
    await expect(evidence.read(seed.ids.owner, record.id, input.evidenceMediaIds[0]!)).resolves.toHaveProperty('url')
    const audits = JSON.stringify((await db.pool.query('SELECT before,after,reason FROM audit_events')).rows)
    expect(audits).not.toContain(input.certificateNumber); expect(audits).not.toContain('https://')
    await expect(db.pool.query('UPDATE certification_history SET action=$1', ['tampered'])).rejects.toThrow()
  })
  it('审核身份投影只含实名昵称，记录查询排除草稿并支持状态与分页', async () => {
    await db.pool.query('INSERT INTO referee_profiles(user_id,legal_name) VALUES($1,$2)', [seed.ids.actor, '认证实名'])
    await db.pool.query('UPDATE users SET display_name=$2 WHERE id=$1', [seed.ids.actor, '认证昵称'])
    const draft = await service.create(seed.ids.actor, input, 'identity')
    expect((await service.records(seed.ids.owner, input.scope, {})).items).toEqual([])
    await service.submit(seed.ids.actor, draft.id, 1)
    const queue = await service.queue(seed.ids.owner, input.scope, {})
    expect(queue.items[0]?.applicant).toEqual({ nickname: '认证昵称', legalName: '认证实名' })
    expect(queue.items[0]).not.toHaveProperty('certificateNumber')
    expect(queue.items[0]?.applicant).not.toHaveProperty('phone')
    const found = await service.records(seed.ids.owner, input.scope, { status: 'under_review', pageSize: '10' })
    expect(found).toMatchObject({ total: 1, page: 1, pageSize: 10 })
    expect((await service.records(seed.ids.owner, input.scope, { status: 'approved' })).items).toEqual([])
    expect((await service.records(seed.ids.owner, input.scope, { page: '2', pageSize: '10' })).items).toEqual([])
    expect((await service.mine(seed.ids.actor, {})).items[0]).not.toHaveProperty('applicant')
    expect(JSON.stringify((await db.pool.query('SELECT before,after FROM audit_events')).rows)).not.toContain('认证实名')
    await expect(service.records(seed.ids.admin, input.scope, {})).rejects.toMatchObject({ statusCode: 404 })
  })
  it('并发创建只保存一个申请，并发审核只有一个版本成功', async () => {
    const created = await Promise.all([service.create(seed.ids.actor, input, 'same'), service.create(seed.ids.actor, input, 'same')])
    expect(created[0]!.id).toBe(created[1]!.id)
    const record = await service.submit(seed.ids.actor, created[0]!.id, 1)
    const decision = { decision: 'approve' as const, expectedVersion: 2, reason: '核验通过' }
    const results = await Promise.allSettled([review.decide(seed.ids.owner, record.id, input.scope, decision), review.decide(seed.ids.owner, record.id, input.scope, decision)])
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
    expect(results.find(r => r.status === 'rejected')).toMatchObject({ reason: { code: 'VERSION_CONFLICT' } })
    expect((await db.pool.query('SELECT version FROM certification_history')).rowCount).toBe(3)
  })
  it('成员退出/重入与组织冻结实时派生效力，人工暂停与撤销不自动恢复', async () => {
    const record = await approved()
    await db.pool.query("UPDATE organization_memberships SET status='left' WHERE organization_id=$1 AND user_id=$2", [seed.ids.orgA, seed.ids.actor])
    expect(await service.detail(seed.ids.actor, record.id)).toMatchObject({ status: 'approved', effectiveStatus: 'suspended' })
    await db.pool.query("UPDATE organization_memberships SET status='active' WHERE organization_id=$1 AND user_id=$2", [seed.ids.orgA, seed.ids.actor])
    expect(await service.detail(seed.ids.actor, record.id)).toMatchObject({ effectiveStatus: 'approved' })
    await review.decide(seed.ids.owner, record.id, input.scope, { decision: 'suspend', expectedVersion: 3, reason: '人工暂停' })
    expect(await service.detail(seed.ids.actor, record.id)).toMatchObject({ status: 'suspended', effectiveStatus: 'suspended' })
    await review.decide(seed.ids.owner, record.id, input.scope, { decision: 'resume', expectedVersion: 4, reason: '恢复' })
    await db.pool.query("UPDATE organization_memberships SET status='left' WHERE organization_id=$1 AND user_id=$2", [seed.ids.orgA, seed.ids.actor])
    await review.decide(seed.ids.owner, record.id, input.scope, { decision: 'revoke', expectedVersion: 5, reason: '退出后撤销' })
    await db.pool.query("UPDATE organization_memberships SET status='active' WHERE organization_id=$1 AND user_id=$2", [seed.ids.orgA, seed.ids.actor])
    expect(await service.detail(seed.ids.actor, record.id)).toMatchObject({ status: 'revoked', effectiveStatus: 'revoked' })
    await db.pool.query("UPDATE organizations SET status='frozen' WHERE id=$1", [seed.ids.orgA])
    expect(await service.detail(seed.ids.actor, record.id)).toMatchObject({ effectiveStatus: 'revoked' })
    await expect(review.decide(seed.ids.owner, record.id, input.scope, { decision: 'revoke', expectedVersion: 5, reason: '撤销' })).rejects.toMatchObject({ statusCode: 404 })
  })
  it('平台申请在创建/提交时检查当前组织资质，平台决定与组织撤销独立', async () => {
    const record = await approved()
    const platform: CreateCertification = { ...input, scope: { type: 'platform', organizationId: null }, evidenceMediaIds: [await media()], historyMediaIds: [await media()] }
    const draft = await service.create(seed.ids.actor, platform, 'platform')
    await db.pool.query("UPDATE organization_memberships SET status='left' WHERE organization_id=$1 AND user_id=$2", [seed.ids.orgA, seed.ids.actor])
    await expect(service.submit(seed.ids.actor, draft.id, 1)).rejects.toMatchObject({ code: 'CERTIFICATION_PREREQUISITE_REQUIRED' })
    await db.pool.query("UPDATE organization_memberships SET status='active' WHERE organization_id=$1 AND user_id=$2", [seed.ids.orgA, seed.ids.actor])
    await service.submit(seed.ids.actor, draft.id, 1)
    await review.decide(seed.ids.admin, draft.id, platform.scope, { decision: 'approve', expectedVersion: 2, reason: '独立核验通过' })
    await review.decide(seed.ids.owner, record.id, input.scope, { decision: 'revoke', expectedVersion: 3, reason: '组织撤销' })
    expect(await service.detail(seed.ids.actor, draft.id)).toMatchObject({ status: 'approved', effectiveStatus: 'approved' })
    await expect(evidence.read(seed.ids.owner, draft.id, platform.evidenceMediaIds[0]!)).rejects.toMatchObject({ statusCode: 403 })
    await expect(evidence.read(seed.ids.admin, draft.id, platform.evidenceMediaIds[0]!)).resolves.toHaveProperty('url')
  })
  it('申诉保持原结论；复核回避、原始记录与新增证据均保留', async () => {
    const record = await submitted()
    await review.decide(seed.ids.owner, record.id, input.scope, { decision: 'reject', expectedVersion: 2, reason: '材料需复核' })
    const extra = await media(), appeal = await appeals.create(seed.ids.actor, record.id, { expectedVersion: 3, reason: '请求复核', evidenceMediaIds: [extra] })
    expect(await service.detail(seed.ids.actor, record.id)).toMatchObject({ status: 'rejected', version: 4 })
    expect((await service.queue(seed.ids.owner, input.scope, {}, true)).items.map(item => item.id)).toEqual([record.id])
    await expect(appeals.decide(seed.ids.owner, record.id, appeal.id, { decision: 'overturn', expectedVersion: 4, reason: '复核' })).rejects.toMatchObject({ code: 'APPEAL_REVIEWER_CONFLICT' })
    // 第二位负责人由真实所有权变更模拟；旧审核人与当前复核人分离。
    await db.pool.query('UPDATE organizations SET owner_user_id=$2 WHERE id=$1', [seed.ids.orgA, seed.ids.admin])
    await db.pool.query("INSERT INTO organization_memberships(id,organization_id,user_id,status) VALUES($1,$2,$3,'active')", [randomUUID(), seed.ids.orgA, seed.ids.admin])
    await db.pool.query("INSERT INTO role_bindings(id,subject_user_id,role,scope_type,scope_id,granted_by,starts_at) VALUES($1,$2,'owner','organization',$3,$2,'2026-11-01')", [randomUUID(), seed.ids.admin, seed.ids.orgA])
    await expect(appeals.application(seed.ids.admin, record.id, appeal.id)).resolves.toMatchObject({ status: 'rejected' })
    await expect(evidence.read(seed.ids.admin, record.id, input.evidenceMediaIds[0]!, appeal.id)).resolves.toHaveProperty('url')
    expect(await appeals.decide(seed.ids.admin, record.id, appeal.id, { decision: 'overturn', expectedVersion: 4, reason: '独立复核通过' })).toMatchObject({ status: 'decided' })
    expect(await service.detail(seed.ids.actor, record.id)).toMatchObject({ status: 'approved', version: 5 })
    await expect(evidence.read(seed.ids.admin, record.id, extra, appeal.id)).resolves.toHaveProperty('url')
    expect((await service.history(seed.ids.actor, record.id, {})).items.some(h => h.record.status === 'rejected')).toBe(true)
  })
  it('组织冻结与平台提交并发时等待同一组织锁，冻结生效后拒绝提交', async () => {
    await approved()
    const platform: CreateCertification = { ...input, scope: { type: 'platform', organizationId: null }, evidenceMediaIds: [await media()], historyMediaIds: [await media()] }
    const draft = await service.create(seed.ids.actor, platform, 'platform-freeze')
    let started!: () => void, release!: () => void
    const ready = new Promise<void>(resolve => { started = resolve }), gate = new Promise<void>(resolve => { release = resolve })
    const freezing = withTransaction(db.pool, async client => {
      await client.query("UPDATE organizations SET status='frozen' WHERE id=$1", [seed.ids.orgA])
      started(); await gate
    })
    await ready
    const submitting = service.submit(seed.ids.actor, draft.id, 1)
    const outcome = expect(submitting).rejects.toMatchObject({ code: 'CERTIFICATION_PREREQUISITE_REQUIRED' })
    release(); await freezing; await outcome
    expect(await service.detail(seed.ids.actor, draft.id)).toMatchObject({ status: 'draft', version: 1 })
  })
  it('审计失败回滚认证、历史与证据引用', async () => {
    const record = await submitted()
    await db.pool.query(`CREATE FUNCTION fail_cert_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.action='certification.decided' THEN RAISE EXCEPTION 'audit failure'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER fail_cert_audit BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION fail_cert_audit()`)
    await expect(review.decide(seed.ids.owner, record.id, input.scope, { decision: 'approve', expectedVersion: 2, reason: '核验' })).rejects.toThrow('audit failure')
    expect(await service.detail(seed.ids.actor, record.id)).toMatchObject({ status: 'under_review', version: 2 })
    expect((await db.pool.query('SELECT version FROM certification_history')).rowCount).toBe(2)
    expect((await db.pool.query('SELECT version FROM certification_media WHERE version=3')).rowCount).toBe(0)
  })
})
