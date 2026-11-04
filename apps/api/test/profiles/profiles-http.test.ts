import { randomUUID } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { buildApp } from '../../src/app.js'
import { DomainError } from '../../src/application/errors.js'
import type { ProfilesService } from '../../src/modules/profiles/profiles.service.js'

const origin = 'https://refs.example.com'
const token = 'b'.repeat(43)
const profile = { userId: randomUUID(), nickname: '裁判甲', legalName: null, phone: null, regionCode: null,
  regionLabel: null, addressDetail: null, birthDate: null, avatarMediaId: null, version: 1 }

async function fixture() {
  const service = { get: vi.fn(async () => profile), update: vi.fn(async () => ({ ...profile, version: 2 })) }
  const sessions = { requireSession: vi.fn(async (value: string | undefined) => {
    if (value !== token) throw new DomainError('UNAUTHENTICATED', '请重新登录', 401)
    return { user: { id: profile.userId, email: 'ref@example.com', displayName: '裁判甲', emailVerified: true, hasPassword: true },
      expiresAt: new Date().toISOString() }
  }) }
  const app = await buildApp({}, { profiles: { service: service as unknown as ProfilesService, sessions, publicOrigin: origin } })
  return { app, service, headers: { cookie: `__Host-refs_session=${token}`, origin } }
}

describe('裁判档案 HTTP 边界', () => {
  it('匿名请求返回 401，响应不缓存', async () => {
    const f = await fixture()
    try {
      const response = await f.app.inject({ url: '/api/v1/profile' })
      expect(response.statusCode).toBe(401)
      expect(response.headers['cache-control']).toBe('no-store')
      expect(f.service.get).not.toHaveBeenCalled()
    } finally { await f.app.close() }
  })

  it('读取与更新使用 Cookie 身份，不接受客户端传入 userId', async () => {
    const f = await fixture()
    try {
      expect((await f.app.inject({ url: '/api/v1/profile', headers: f.headers })).json().data.nickname).toBe('裁判甲')
      expect(f.service.get).toHaveBeenCalledWith(profile.userId)
      const response = await f.app.inject({ method: 'PATCH', url: '/api/v1/profile', headers: f.headers,
        payload: { version: 1, nickname: '裁判乙' } })
      expect(response.statusCode).toBe(200)
      expect(f.service.update).toHaveBeenCalledWith(profile.userId, { version: 1, nickname: '裁判乙' })
      const forbidden = await f.app.inject({ method: 'PATCH', url: '/api/v1/profile', headers: f.headers,
        payload: { version: 1, nickname: '裁判乙', userId: profile.userId } })
      expect(forbidden.statusCode).toBe(400)
    } finally { await f.app.close() }
  })

  it('拒绝跨站写入与缺少版本号的更新', async () => {
    const f = await fixture()
    try {
      expect((await f.app.inject({ method: 'PATCH', url: '/api/v1/profile',
        headers: { ...f.headers, origin: 'https://attacker.example.com' }, payload: { version: 1, nickname: '裁判乙' } }))
        .statusCode).toBe(403)
      expect((await f.app.inject({ method: 'PATCH', url: '/api/v1/profile', headers: f.headers,
        payload: { nickname: '裁判乙' } })).statusCode).toBe(400)
      expect(f.service.update).not.toHaveBeenCalled()
    } finally { await f.app.close() }
  })
})
