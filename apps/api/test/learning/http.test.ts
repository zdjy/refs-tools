import { describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app.js'
import { DomainError } from '../../src/application/errors.js'
import { learningHarness } from '../helpers/learning.js'

async function fixture() {
  const h = learningHarness(), origin = 'https://refs.example.com', token = 'a'.repeat(43)
  const app = await buildApp({}, { learning: { ...h, publicOrigin: origin, sessions: { requireSession: async value => {
    if (value !== token) throw new DomainError('UNAUTHENTICATED', '请重新登录', 401)
    return { user: { id: h.actor, email: 'ref@example.com', displayName: '裁判', emailVerified: false, hasPassword: false, avatarMediaId: null }, expiresAt: '2027-01-01T00:00:00.000Z' }
  } } } })
  return { ...h, app, headers: { origin, cookie: `__Host-refs_session=${token}`, 'idempotency-key': 'http' } }
}

describe('学习 HTTP 门禁与契约', () => {
  it('匿名与跨站拒绝；UUID、分页、额外字段和缺少版本在边界拒绝', async () => {
    const h = await fixture()
    try {
      const anonymous = await h.app.inject('/api/v1/learning/assets')
      expect(anonymous.statusCode).toBe(401); expect(anonymous.headers['cache-control']).toBe('no-store')
      expect((await h.app.inject({ method: 'POST', url: '/api/v1/admin/learning/assets', headers: { ...h.headers, origin: 'https://evil.example.com' }, payload: h.input })).statusCode).toBe(403)
      for (const url of ['/api/v1/learning/assets/invalid', '/api/v1/learning/categories?pageSize=500', '/api/v1/learning/assets?tagId=x']) {
        expect((await h.app.inject({ url, headers: h.headers })).statusCode).toBe(400)
      }
      expect((await h.app.inject({ method: 'POST', url: '/api/v1/admin/learning/assets', headers: h.headers, payload: { ...h.input, createdBy: h.actor } })).statusCode).toBe(400)
      expect((await h.app.inject({ method: 'POST', url: `/api/v1/admin/learning/assets/${h.id}/publish`, headers: h.headers, payload: { version: 1 } })).statusCode).toBe(400)
    } finally { await h.app.close() }
  })
  it('创建/发布后未验证邮箱可浏览正文和媒体；下线后返回 404，历史管理入口受权保护', async () => {
    const h = await fixture()
    try {
      const created = await h.app.inject({ method: 'POST', url: '/api/v1/admin/learning/assets', headers: h.headers, payload: h.input })
      expect(created.statusCode).toBe(201)
      const id = created.json().data.asset.id
      const published = await h.app.inject({ method: 'POST', url: `/api/v1/admin/learning/assets/${id}/publish`, headers: h.headers, payload: { expectedRevision: 1, version: 1 } })
      expect(published.statusCode).toBe(200)
      h.setVerified(false)
      const detail = await h.app.inject({ url: `/api/v1/learning/assets/${id}`, headers: h.headers })
      expect(detail.statusCode).toBe(200); expect(detail.json().data.content.title).toBe(h.input.title)
      const read = await h.app.inject({ url: `/api/v1/learning/assets/${id}/media/${h.mediaId}/read-url?mode=view`, headers: h.headers })
      expect(read.statusCode).toBe(200); expect(read.body).not.toContain('objectKey'); expect(read.headers['cache-control']).toBe('no-store')
      h.setVerified(true)
      expect((await h.app.inject({ method: 'POST', url: `/api/v1/admin/learning/assets/${id}/unpublish`, headers: h.headers, payload: { expectedRevision: 2 } })).statusCode).toBe(200)
      expect((await h.app.inject({ url: `/api/v1/learning/assets/${id}`, headers: h.headers })).statusCode).toBe(404)
      expect((await h.app.inject({ url: `/api/v1/admin/learning/assets/${id}/versions/1`, headers: h.headers })).statusCode).toBe(200)
      h.setAllowed(false)
      expect((await h.app.inject({ url: `/api/v1/admin/learning/assets/${id}/versions/1`, headers: h.headers })).statusCode).toBe(403)
    } finally { await h.app.close() }
  })
})
