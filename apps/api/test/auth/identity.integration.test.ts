import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { ChallengeMail } from '../../src/modules/auth/auth.types.js'
import { AuthService } from '../../src/modules/auth/auth.service.js'
import { PgAuthRepository } from '../../src/modules/auth/auth.repository.js'
import { defaultAuthPolicy } from '../../src/modules/auth/auth.config.js'
import { createTransactionRunner } from '../../src/infrastructure/database/transaction.js'
import { applyTestMigrations, createTestDatabase, type TestDatabase } from '../helpers/database.js'

describe('PostgreSQL 身份与凭据', () => {
  let database: TestDatabase
  let service: AuthService
  let mail: ChallengeMail[]
  let time: Date
  beforeAll(async () => { database = await createTestDatabase() })
  beforeEach(async () => {
    await database.reset()
    await applyTestMigrations(database.pool)
    mail = []
    time = new Date('2026-11-02T00:00:00Z')
    service = new AuthService({
      transaction: createTransactionRunner(database.pool, (client) => ({ auth: new PgAuthRepository(client) })),
      email: { async sendChallenge(message) { mail.push(message) } },
      policy: { ...defaultAuthPolicy }, secret: 'integration-test-secret-at-least-32-bytes', now: () => time,
    })
  })
  afterAll(async () => { await database?.close() })

  it('规范化凭据注册、持久会话恢复与注销', async () => {
    const challenge = await service.issueChallenge({ email: 'REF@example.com', purpose: 'register' }, 'ip')
    const grant = await service.register({ ...challenge, code: mail[0]!.code, displayName: '裁判', password: 'original-password-123' })
    const login = await service.loginWithPassword({ email: 'ref@example.com', password: 'original-password-123' }, 'ip')
    expect(login.user).toEqual(grant.user)
    await service.logout(grant.token)
    await expect(service.requireSession(grant.token)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
    expect((await service.requireSession(login.token)).user.email).toBe('ref@example.com')
  })

  it('并发消费同一验证码只签发一次会话', async () => {
    const c = await service.issueChallenge({ email: 'ref@example.com', purpose: 'register' }, 'ip')
    const input = { ...c, code: mail[0]!.code, displayName: '裁判' }
    const results = await Promise.allSettled([service.register(input), service.register(input)])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((r) => r.status === 'rejected')).toMatchObject([{ reason: { code: 'INVALID_CHALLENGE' } }])
  })

  it('并发首次设置只接受一个密码，持久化状态与轮换会话一致', async () => {
    const c = await service.issueChallenge({ email: 'ref@example.com', purpose: 'register' }, 'ip')
    const original = await service.register({ ...c, code: mail[0]!.code, displayName: '裁判' })
    expect((await service.requireSession(original.token)).user.hasPassword).toBe(false)
    const passwords = ['first-password-123', 'second-password-123']
    const results = await Promise.allSettled(passwords.map((newPassword) => service.setPassword(original.token, { newPassword })))
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((result) => result.status === 'rejected')).toMatchObject([{ reason: { code: 'UNAUTHENTICATED' } }])
    const winner = results.findIndex((result) => result.status === 'fulfilled')
    const result = results[winner]!
    if (result.status !== 'fulfilled') throw new Error('首次设置未产生成功结果')
    expect((await service.requireSession(result.value.token)).user.hasPassword).toBe(true)
    await expect(service.requireSession(original.token)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
    await expect(service.loginWithPassword({ email: original.user.email, password: passwords[winner]! }, 'ip'))
      .resolves.toHaveProperty('user.id', original.user.id)
    await expect(service.loginWithPassword({ email: original.user.email, password: passwords[1 - winner]! }, 'ip'))
      .rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
  })

  it('不同 challenge 并发注册同一邮箱不能创建第二个账号', async () => {
    const first = await service.issueChallenge({ email: 'ref@example.com', purpose: 'register' }, 'ip')
    const firstCode = mail[0]!.code
    time = new Date(time.getTime() + 60000)
    const second = await service.issueChallenge({ email: 'REF@example.com', purpose: 'register' }, 'ip')
    const results = await Promise.allSettled([
      service.register({ ...first, code: firstCode, displayName: '第一人' }),
      service.register({ ...second, code: mail[1]!.code, displayName: '第二人' }),
    ])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((r) => r.status === 'rejected')).toMatchObject([{ reason: { code: 'INVALID_CHALLENGE' } }])
  })

  it('失败次数持久化，事务结束后正确验证码仍因耗尽而失败', async () => {
    const c = await service.issueChallenge({ email: 'ref@example.com', purpose: 'register' }, 'ip')
    const code = mail[0]!.code
    const wrong = code === '000000' ? '111111' : '000000'
    for (let n = 0; n < 5; n++) await expect(service.register({ ...c, code: wrong, displayName: '裁判' }))
      .rejects.toMatchObject({ code: 'INVALID_CHALLENGE' })
    await expect(service.register({ ...c, code, displayName: '裁判' })).rejects.toMatchObject({ code: 'INVALID_CHALLENGE' })
  })

  it('并发发送频控以数据库原子计数为准', async () => {
    const results = await Promise.allSettled(Array.from({ length: 6 }, () =>
      service.issueChallenge({ email: 'ref@example.com', purpose: 'register' }, 'ip')))
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(5)
  })

  it('数据库不保存明文验证码、会话 token 或密码', async () => {
    const c = await service.issueChallenge({ email: 'ref@example.com', purpose: 'register' }, 'ip')
    const grant = await service.register({ ...c, code: mail[0]!.code, displayName: '裁判', password: 'original-password-123' })
    const challenge = await database.pool.query('SELECT code_hash FROM email_challenges WHERE id = $1', [c.challengeId])
    expect(challenge.rows[0].code_hash).toMatch(/^[a-f0-9]{64}$/)
    expect(challenge.rows[0].code_hash).not.toBe(mail[0]!.code)
    const account = await database.pool.query('SELECT password_hash FROM users WHERE id = $1', [grant.user.id])
    expect(account.rows[0].password_hash).toMatch(/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/)
    const sessions = await database.pool.query('SELECT token_hash FROM auth_sessions WHERE user_id = $1', [grant.user.id])
    expect(sessions.rows[0].token_hash).toMatch(/^[a-f0-9]{64}$/)
    expect(sessions.rows[0].token_hash).not.toBe(grant.token)
  })

  it('账号禁用后所有现存会话立即失效，数据库约束拒绝非法凭据', async () => {
    const c = await service.issueChallenge({ email: 'ref@example.com', purpose: 'register' }, 'ip')
    const grant = await service.register({ ...c, code: mail[0]!.code, displayName: '裁判' })
    await database.pool.query("UPDATE users SET status = 'disabled' WHERE id = $1", [grant.user.id])
    await expect(service.requireSession(grant.token)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
    await expect(database.pool.query("INSERT INTO users (id, email, display_name) VALUES (gen_random_uuid(), 'ref@example.com', '重复')"))
      .rejects.toMatchObject({ code: '23505', constraint: 'users_email_unique' })
    await expect(database.pool.query("INSERT INTO users (id, email, display_name) VALUES (gen_random_uuid(), 'UPPER@example.com', '非法')"))
      .rejects.toMatchObject({ code: '23514', constraint: 'users_email_normalized' })
    await expect(database.pool.query("INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (repeat('a', 64), gen_random_uuid(), now())"))
      .rejects.toMatchObject({ code: '23503' })
  })
})
