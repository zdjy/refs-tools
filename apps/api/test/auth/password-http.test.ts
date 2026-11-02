import { afterEach, describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app.js'
import { createAuthHarness } from '../helpers/auth.js'

const origin = 'https://refs.example.com'
describe('设置密码 HTTP 边界', () => {
  let app: Awaited<ReturnType<typeof buildApp>> | undefined
  afterEach(async () => { await app?.close() })

  it('注册会话可直接设置密码并签发新 Cookie，已有密码不能省略验证码', async () => {
    const h = createAuthHarness()
    const grant = await h.register()
    app = await buildApp({ logger: false }, { auth: { service: h.service, publicOrigin: origin } })
    const headers = { origin, cookie: `__Host-refs_session=${grant.token}` }
    const response = await app.inject({ method: 'POST', url: '/api/v1/auth/password', headers,
      payload: { newPassword: 'a-long-password-123' } })
    expect(response.statusCode).toBe(200)
    expect(response.json().data.user.hasPassword).toBe(true)
    expect(response.body).not.toMatch(/token|passwordHash/)
    expect(response.headers['cache-control']).toBe('no-store')
    const cookie = (response.headers['set-cookie'] as string).split(';')[0]!
    expect(cookie).not.toBe(headers.cookie)
    expect((await app.inject({ method: 'GET', url: '/api/v1/auth/session', headers })).statusCode).toBe(401)
    const restored = await app.inject({ method: 'GET', url: '/api/v1/auth/session', headers: { cookie } })
    expect(restored.json().data.user.hasPassword).toBe(true)
    const denied = await app.inject({ method: 'POST', url: '/api/v1/auth/password', headers: { origin, cookie },
      payload: { newPassword: 'another-password-123' } })
    expect(denied.statusCode).toBe(403)
    expect(denied.json().error.code).toBe('PASSWORD_VERIFICATION_REQUIRED')
  })

  it('首次设置仍要求登录、同源请求，拒绝残缺 proof 和额外权限字段', async () => {
    const h = createAuthHarness()
    const grant = await h.register()
    app = await buildApp({ logger: false }, { auth: { service: h.service, publicOrigin: origin } })
    const cookie = `__Host-refs_session=${grant.token}`
    const payload = { newPassword: 'a-long-password-123' }
    const anonymous = await app.inject({ method: 'POST', url: '/api/v1/auth/password', headers: { origin }, payload })
    expect(anonymous.statusCode).toBe(401)
    for (const site of [undefined, 'https://attacker.example.com']) {
      const response = await app.inject({ method: 'POST', url: '/api/v1/auth/password',
        headers: { cookie, ...(site ? { origin: site } : {}) }, payload })
      expect(response.statusCode).toBe(403)
    }
    for (const extra of [{ code: '123456' }, { challengeId: '00000000-0000-4000-8000-000000000001' },
      { hasPassword: false }, { userId: grant.user.id }]) {
      const response = await app.inject({ method: 'POST', url: '/api/v1/auth/password', headers: { origin, cookie },
        payload: { ...payload, ...extra } })
      expect(response.statusCode).toBe(400)
      expect(response.json().error.code).toBe('INVALID_REQUEST')
    }
  })
})
