import { randomBytes } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../../src/app.js'
import { AuthService } from '../../src/modules/auth/auth.service.js'
import { PgAuthRepository } from '../../src/modules/auth/auth.repository.js'
import { defaultAuthPolicy } from '../../src/modules/auth/auth.config.js'
import { digest } from '../../src/modules/auth/auth.security.js'
import { createTransactionRunner } from '../../src/infrastructure/database/transaction.js'
import { AuditService } from '../../src/modules/audit/audit.service.js'
import { RoleBindingService } from '../../src/modules/authorization/role-bindings.service.js'
import { applyTestMigrations, createTestDatabase, type TestDatabase } from '../helpers/database.js'
import { seedAuthorization } from '../helpers/authorization.js'

describe('组织审计查询 HTTP 与真实 Cookie 会话', () => {
  let db: TestDatabase, app: FastifyInstance
  let fixture: Awaited<ReturnType<typeof seedAuthorization>>
  const tokens = { owner: randomBytes(32).toString('base64url'), actor: randomBytes(32).toString('base64url') }
  const cookie = (role: keyof typeof tokens) => ({ cookie: `__Host-refs_session=${tokens[role]}` })
  beforeAll(async () => {
    db = await createTestDatabase()
    await applyTestMigrations(db.pool)
    fixture = await seedAuthorization(db.pool)
    for (const role of ['owner', 'actor'] as const) {
      await db.pool.query('INSERT INTO auth_sessions (token_hash,user_id,expires_at) VALUES ($1,$2,$3)',
        [digest(tokens[role]), fixture.ids[role], '2026-11-03T00:00:00.000Z'])
    }
    const sessions = new AuthService({ now: fixture.now, secret: 'test-secret-with-at-least-32-characters', policy: defaultAuthPolicy,
      email: { async sendChallenge() {} }, transaction: createTransactionRunner(db.pool, (client) => ({ auth: new PgAuthRepository(client) })) })
    app = await buildApp({}, { audit: { service: new AuditService(fixture), sessions } })
    const roles = new RoleBindingService(fixture)
    await roles.grant(fixture.ids.owner, { subjectUserId: fixture.ids.actor,
      role: 'certifier', scope: { type: 'organization', id: fixture.ids.orgA }, expiresAt: null })
    await roles.grant(fixture.ids.owner, { subjectUserId: fixture.ids.actor,
      role: 'head_referee', scope: { type: 'match', id: fixture.ids.matchA }, expiresAt: null })
  })
  afterAll(async () => { await app?.close(); await db?.close() })

  it('平台级审计 HTTP 入口已移除，匿名组织查询 401', async () => {
    expect((await app.inject('/api/v1/admin/audit-events')).statusCode).toBe(404)
    expect((await app.inject({ url: `/api/v1/organizations/${fixture.ids.orgA}/audit-events`, headers: cookie('owner') })).statusCode).toBe(200)
    expect((await app.inject({ url: `/api/v1/organizations/${fixture.ids.orgA}/audit-events`, headers: cookie('actor') })).statusCode).toBe(200)
    expect((await app.inject(`/api/v1/organizations/${fixture.ids.orgA}/audit-events`)).statusCode).toBe(401)
    for (const id of [fixture.ids.orgB, fixture.ids.actor]) {
      const response = await app.inject({ url: `/api/v1/organizations/${id}/audit-events`, headers: cookie('owner') })
      expect(response.statusCode).toBe(404)
      expect(response.json().error.code).toBe('NOT_FOUND')
    }
  })

  it('组织所有者只读本组织摘要，包含下属赛事审计；无私密快照并禁止缓存', async () => {
    const response = await app.inject({ url: `/api/v1/organizations/${fixture.ids.orgA}/audit-events?scopeType=organization&resourceType=role_binding&limit=1`, headers: cookie('owner') })
    expect(response.statusCode).toBe(200)
    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.json().data.items).toHaveLength(1)
    expect(response.json().data.items[0]).toMatchObject({ action: 'role.granted', scopeId: fixture.ids.orgA })
    expect(response.json().data.items[0]).not.toHaveProperty('after')
    for (const suffix of ['limit=101', 'cursor=bad', 'unexpected=1']) {
      expect((await app.inject({ url: `/api/v1/organizations/${fixture.ids.orgA}/audit-events?${suffix}`, headers: cookie('owner') })).statusCode).toBe(400)
    }
  })

  it('已撤销登录会话返回 401', async () => {
    await db.pool.query('UPDATE auth_sessions SET revoked_at=now() WHERE token_hash=$1', [digest(tokens.owner)])
    expect((await app.inject({ url: `/api/v1/organizations/${fixture.ids.orgA}/audit-events`, headers: cookie('owner') })).statusCode).toBe(401)
  })
})
