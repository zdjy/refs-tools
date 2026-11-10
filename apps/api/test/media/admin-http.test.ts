import { describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app.js'
import { DomainError } from '../../src/application/errors.js'
import { adminFixture } from './admin-fixture.js'

async function fixture() {
  const f = await adminFixture(), token = 'a'.repeat(43)
  const app = await buildApp({}, { adminMedia: { service: f.service, publicOrigin: 'https://admin.example.com', sessions: {
    async requireVerifiedSession(value) {
      if (value !== token) throw new DomainError('UNAUTHENTICATED', '请登录', 401)
      return { user: { id: f.admin, email: 'admin@example.com', displayName: '管理员', emailVerified: true, hasPassword: true, avatarMediaId: null }, expiresAt: new Date().toISOString() }
    },
  } } })
  return { ...f, app, headers: { cookie: `__Host-refs_session=${token}`, origin: 'https://admin.example.com' } }
}
describe('文件治理 HTTP', () => {
  it('真实用例贯穿 Cookie 身份、元数据、下载和删除', async () => {
    const f = await fixture()
    try {
      const list = await f.app.inject({ url: '/api/v1/admin/media?page=1', headers: f.headers })
      expect(list.statusCode).toBe(200); expect(list.headers['cache-control']).toBe('no-store')
      expect(list.json().data.items[0]).not.toHaveProperty('objectKey')
      expect((await f.app.inject({ url: `/api/v1/admin/media/${f.intent.mediaId}`, headers: f.headers })).statusCode).toBe(200)
      expect((await f.app.inject({ method: 'POST', url: `/api/v1/admin/media/${f.intent.mediaId}/read-url`, headers: f.headers, payload: { reason: '附件复核' } })).statusCode).toBe(200)
      expect((await f.app.inject({ method: 'DELETE', url: `/api/v1/admin/media/${f.intent.mediaId}`, headers: f.headers, payload: { reason: '违规附件' } })).statusCode).toBe(200)
    } finally { await f.app.close() }
  })
  it('拒绝匿名、跨源、非法查询、额外字段与媒体字节', async () => {
    const f = await fixture(), path = `/api/v1/admin/media/${f.intent.mediaId}`
    try {
      expect((await f.app.inject({ url: '/api/v1/admin/media', headers: { token: 'fake' } })).statusCode).toBe(401)
      expect((await f.app.inject({ method: 'DELETE', url: path, headers: { ...f.headers, origin: 'https://evil.example' }, payload: { reason: 'test' } })).statusCode).toBe(403)
      for (const url of ['/api/v1/admin/media?page=0', `/api/v1/admin/media?ownerUserId=${f.admin}`, `/api/v1/admin/media?ownerKeyword=${'x'.repeat(101)}`, '/api/v1/admin/media?status=unknown', '/api/v1/admin/media?objectKey=private', '/api/v1/admin/media/not-uuid']) {
        expect((await f.app.inject({ url, headers: f.headers })).statusCode).toBe(400)
      }
      expect((await f.app.inject({ method: 'DELETE', url: path, headers: f.headers, payload: { reason: 'test', ownerUserId: f.admin } })).statusCode).toBe(400)
      const response = await f.app.inject({ method: 'POST', url: `${path}/read-url`, headers: { ...f.headers, 'content-type': 'image/jpeg' }, payload: Buffer.from('bytes') })
      expect(response.statusCode).toBe(415); expect(response.headers['cache-control']).toBe('no-store')
      f.revoke(); expect((await f.app.inject({ url: '/api/v1/admin/media', headers: f.headers })).statusCode).toBe(403)
    } finally { await f.app.close() }
  })
})
