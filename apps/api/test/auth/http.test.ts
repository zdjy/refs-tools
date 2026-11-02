import { afterEach, describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app.js'
import { createAuthHarness } from '../helpers/auth.js'

const origin = 'https://refs.example.com'
describe('认证 HTTP 边界', () => {
  let app: Awaited<ReturnType<typeof buildApp>> | undefined
  afterEach(async () => { await app?.close() })

  it('注册仅经安全 Cookie 签发会话，可查询和注销且禁止缓存', async () => {
    const h = createAuthHarness()
    app = await buildApp({ logger: false }, { auth: { service: h.service, publicOrigin: origin } })
    const challenge = await app.inject({ method: 'POST', url: '/api/v1/auth/email-challenges',
      headers: { origin }, payload: { email: 'ref@example.com', purpose: 'register' } })
    expect(challenge.statusCode).toBe(202)
    const response = await app.inject({ method: 'POST', url: '/api/v1/auth/register', headers: { origin },
      payload: { challengeId: challenge.json().data.challengeId, code: h.mail[0]!.code, displayName: '裁判' } })
    expect(response.statusCode).toBe(201)
    expect(response.json().data).toEqual({ user: expect.objectContaining({ emailVerified: true }), expiresAt: expect.any(String) })
    expect(response.body).not.toMatch(/token|passwordHash|codeHash/)
    expect(response.headers['cache-control']).toBe('no-store')
    const cookie = response.headers['set-cookie'] as string
    expect(cookie).toContain('__Host-refs_session=')
    for (const flag of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/']) expect(cookie).toContain(flag)
    const cookieHeader = cookie.split(';')[0]!
    const session = await app.inject({ method: 'GET', url: '/api/v1/auth/session', headers: { cookie: cookieHeader } })
    expect(session.statusCode).toBe(200)
    const logout = await app.inject({ method: 'POST', url: '/api/v1/auth/logout', headers: { cookie: cookieHeader, origin } })
    expect(logout.statusCode).toBe(200)
    expect(logout.headers['set-cookie']).toContain('Max-Age=0')
    const expired = await app.inject({ method: 'GET', url: '/api/v1/auth/session', headers: { cookie: cookieHeader } })
    expect(expired.statusCode).toBe(401)
    expect(expired.json().error.code).toBe('UNAUTHENTICATED')
  })

  it('拒绝跨站和缺失 Origin 的写请求，输入错误返回标准 400', async () => {
    const h = createAuthHarness()
    app = await buildApp({ logger: false }, { auth: { service: h.service, publicOrigin: origin } })
    for (const headers of [{}, { origin: 'https://attacker.example.com' }]) {
      const response = await app.inject({ method: 'POST', url: '/api/v1/auth/email-challenges', headers,
        payload: { email: 'ref@example.com', purpose: 'register' } })
      expect(response.statusCode).toBe(403)
      expect(response.json().error.code).toBe('ORIGIN_REJECTED')
      expect(response.headers['cache-control']).toBe('no-store')
    }
    for (const payload of [{ email: 'invalid', purpose: 'register' },
      { email: 'ref@example.com', purpose: 'register', role: 'platform_admin' }]) {
      const response = await app.inject({ method: 'POST', url: '/api/v1/auth/email-challenges', headers: { origin }, payload })
      expect(response.statusCode).toBe(400)
      expect(response.json()).toEqual({ error: { code: 'INVALID_REQUEST', message: expect.any(String), requestId: expect.any(String) } })
    }
  })

  it('认证 JSON 超过 8 KiB 被拒绝，Cookie 重复时不采信会话', async () => {
    const h = createAuthHarness()
    app = await buildApp({ logger: false }, { auth: { service: h.service, publicOrigin: origin } })
    const response = await app.inject({ method: 'POST', url: '/api/v1/auth/register', headers: { origin },
      payload: { displayName: 'x'.repeat(9000) } })
    expect(response.statusCode).toBe(413)
    expect(response.json().error.code).toBe('INVALID_REQUEST')
    const grant = await h.register()
    const duplicate = await app.inject({ method: 'GET', url: '/api/v1/auth/session',
      headers: { cookie: `__Host-refs_session=${grant.token}; __Host-refs_session=${grant.token}` } })
    expect(duplicate.statusCode).toBe(401)
  })
})
