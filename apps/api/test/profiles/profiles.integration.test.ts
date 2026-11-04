import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AuthService } from '../../src/modules/auth/auth.service.js'
import { PgAuthRepository } from '../../src/modules/auth/auth.repository.js'
import { defaultAuthPolicy } from '../../src/modules/auth/auth.config.js'
import { PgProfilesRepository } from '../../src/modules/profiles/profiles.repository.js'
import { ProfilesService } from '../../src/modules/profiles/profiles.service.js'
import { PgAuditRepository } from '../../src/modules/audit/audit.repository.js'
import { createTransactionRunner } from '../../src/infrastructure/database/transaction.js'
import { applyTestMigrations, createTestDatabase, type TestDatabase } from '../helpers/database.js'

describe('PostgreSQL 裁判档案', () => {
  let database: TestDatabase
  let profiles: ProfilesService
  let auth: AuthService
  let mail: { code: string }[]
  let userId: string
  beforeAll(async () => { database = await createTestDatabase() })
  beforeEach(async () => {
    await database.reset()
    await applyTestMigrations(database.pool)
    mail = []
    auth = new AuthService({
      transaction: createTransactionRunner(database.pool, (client) => ({ auth: new PgAuthRepository(client) })),
      email: { async sendChallenge(message) { mail.push(message) } },
      policy: { ...defaultAuthPolicy }, secret: 'integration-test-secret-at-least-32-bytes', now: () => new Date(),
    })
    profiles = new ProfilesService({
      transaction: createTransactionRunner(database.pool, (client) => ({
        profiles: new PgProfilesRepository(client), audit: new PgAuditRepository(client),
      })), now: () => new Date(),
    })
    const challenge = await auth.issueChallenge({ email: 'ref@example.com', purpose: 'register' }, 'ip')
    const grant = await auth.register({ ...challenge, code: mail[0]!.code, displayName: '裁判甲' })
    userId = grant.user.id
  })
  afterAll(async () => { await database?.close() })

  it('首次读取没有档案行时返回空字段，保存后昵称与档案同时落库并递增版本', async () => {
    const empty = await profiles.get(userId)
    expect(empty).toMatchObject({ nickname: '裁判甲', legalName: null, regionCode: null, version: 1 })
    const saved = await profiles.update(userId, { version: 1, legalName: '张三', phone: '+8613800138000',
      regionCode: '310104', regionLabel: '上海市/徐汇区', birthDate: '1990-02-28', nickname: '裁判乙' })
    expect(saved).toMatchObject({ nickname: '裁判乙', legalName: '张三', regionLabel: '上海市/徐汇区', version: 2 })
    const rows = await database.pool.query('SELECT display_name,version FROM users WHERE id=$1', [userId])
    expect(rows.rows[0]).toEqual({ display_name: '裁判乙', version: 2 })
    const audit = await database.pool.query("SELECT action FROM audit_events WHERE resource_id=$1", [userId])
    expect(audit.rows).toEqual([{ action: 'profile.updated' }])
  })

  it('陈旧版本被拒绝且不产生部分更新', async () => {
    await profiles.update(userId, { version: 1, legalName: '张三' })
    await expect(profiles.update(userId, { version: 1, nickname: '裁判丙' })).rejects.toMatchObject({ code: 'VERSION_CONFLICT' })
    expect((await profiles.get(userId)).nickname).toBe('裁判甲')
  })

  it('数据库兜底约束拒绝不成对的地区与非 E.164 手机号', async () => {
    await expect(database.pool.query(`INSERT INTO referee_profiles (user_id,region_code) VALUES ($1,'310104')`, [userId]))
      .rejects.toThrow(/referee_profiles_region_pair/)
    await expect(database.pool.query(`INSERT INTO referee_profiles (user_id,phone_e164) VALUES ($1,'13800138000')`, [userId]))
      .rejects.toThrow(/phone_e164/)
  })

  it('头像必须引用已核验且属于本人的 avatar 对象', async () => {
    await expect(profiles.update(userId, { version: 1, avatarMediaId: randomUUID() })).rejects.toMatchObject({ code: 'INVALID_AVATAR' })
    const media = randomUUID()
    await database.pool.query(`INSERT INTO media_objects
      (id,owner_user_id,purpose,object_key,target_type,target_id,declared_content_type,expected_size_bytes,status,expires_at,created_at,idempotency_key,request_fingerprint,verified_size_bytes,verified_at,etag)
      VALUES ($1,$2,'avatar',$3,'self',$2,'image/jpeg',1024,'available',now()+interval '1 hour',now(),$4,'fp',1024,now(),'etag')`,
    [media, userId, `media/${userId}/${media}`, `key-${media}`])
    expect((await profiles.update(userId, { version: 1, avatarMediaId: media })).avatarMediaId).toBe(media)
  })
})
