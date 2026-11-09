import { describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app.js'
import { DomainError } from '../../src/application/errors.js'
import { certificationFixture } from './fixture.js'

async function fixture() {
  const f = certificationFixture(), origin = 'https://refs.example.com', token = 'a'.repeat(43)
  const app = await buildApp({}, { certifications: { service: f.service, review: f.review, appeals: f.appealService, evidence: f.evidence,
    publicOrigin: origin, sessions: { requireVerifiedSession: async value => {
      if (value !== token) throw new DomainError('UNAUTHENTICATED', '请重新登录', 401)
      return { user: { id: f.subject, email: 'ref@example.com', displayName: '裁判', emailVerified: true, hasPassword: false, avatarMediaId: null }, expiresAt: f.record().createdAt }
    } } } })
  return { ...f, app, headers: { origin, cookie: `__Host-refs_session=${token}`, 'idempotency-key': 'http-create' } }
}

describe('认证 HTTP 门禁与契约', () => {
  it('匿名与跨站请求拒绝，错误也禁止缓存', async () => {
    const f = await fixture()
    try {
      const anonymous = await f.app.inject('/api/v1/me/certifications')
      expect(anonymous.statusCode).toBe(401); expect(anonymous.headers['cache-control']).toBe('no-store')
      const cross = await f.app.inject({ method: 'POST', url: '/api/v1/certifications', headers: { ...f.headers, origin: 'https://evil.example.com' }, payload: f.input })
      expect(cross.statusCode).toBe(403); expect(f.r.certifications.insert).not.toHaveBeenCalled()
    } finally { await f.app.close() }
  })
  it('UUID、分页、级别、版本与额外主体字段在 API 边界拒绝', async () => {
    const f = await fixture()
    try {
      for (const url of ['/api/v1/certifications/invalid', '/api/v1/me/certifications?pageSize=500']) {
        expect((await f.app.inject({ url, headers: f.headers })).statusCode).toBe(400)
      }
      for (const payload of [{ ...f.input, level: 'level_9' }, { ...f.input, subjectUserId: f.owner }, { ...f.input, evidenceMediaIds: [] }]) {
        expect((await f.app.inject({ method: 'POST', url: '/api/v1/certifications', headers: f.headers, payload })).statusCode).toBe(400)
      }
      expect((await f.app.inject({ method: 'POST', url: `/api/v1/certifications/${f.record().id}/submit`, headers: f.headers, payload: {} })).statusCode).toBe(400)
      expect(f.r.certifications.insert).not.toHaveBeenCalled()
    } finally { await f.app.close() }
  })
  it('Cookie 主体创建草稿、提交并读取证据，响应不包含内部存储路径', async () => {
    const f = await fixture(); f.setExists(false)
    try {
      const created = await f.app.inject({ method: 'POST', url: '/api/v1/certifications', headers: f.headers, payload: f.input })
      expect(created.statusCode).toBe(201)
      const id = created.json().data.id
      expect(created.json().data).toMatchObject({ subjectUserId: f.subject, status: 'draft', version: 1 })
      const submitted = await f.app.inject({ method: 'POST', url: `/api/v1/certifications/${id}/submit`, headers: f.headers, payload: { expectedVersion: 1 } })
      expect(submitted.statusCode).toBe(200); expect(submitted.json().data.status).toBe('under_review')
      const read = await f.app.inject({ url: `/api/v1/certifications/${id}/evidence/${f.input.evidenceMediaIds[0]}/read-url`, headers: f.headers })
      expect(read.statusCode).toBe(200); expect(read.json().data.url).toBe('https://storage.example/read')
      expect(read.body).not.toContain('objectKey'); expect(read.headers['cache-control']).toBe('no-store')
    } finally { await f.app.close() }
  })
})
