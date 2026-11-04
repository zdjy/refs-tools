import { randomUUID } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { buildApp } from '../../src/app.js'
import { DomainError } from '../../src/application/errors.js'
import type { OrganizationsService } from '../../src/modules/organizations/organizations.service.js'

async function fixture() {
  const actor = randomUUID(), id = randomUUID(), token = 'a'.repeat(43)
  const organization = { id, name: '协会', region: '上海', purpose: '培训', ownerUserId: actor, status: 'pending_review',
    version: 1, createdAt: new Date().toISOString(), ownerLegalName: '负责人', contact: 'private@example.com',
    reviewedBy: null, reviewedAt: null, governanceReason: null }
  const service = { list: vi.fn(async () => ({ items: [organization], total: 1, page: 1, pageSize: 20 })),
    detail: vi.fn(async () => organization), create: vi.fn(async () => organization), decide: vi.fn(async () => organization) }
  const sessions = { requireVerifiedSession: vi.fn(async (value: string | undefined) => {
    if (value !== token) throw new DomainError('UNAUTHENTICATED', '请重新登录', 401)
    return { user: { id: actor, email: 'admin@example.com', displayName: '管理员', emailVerified: true, hasPassword: true }, expiresAt: new Date().toISOString() }
  }) }
  const app = await buildApp({}, { organizations: { service: service as unknown as OrganizationsService, sessions, publicOrigin: 'https://admin.example.com' } })
  return { app, service, actor, id, organization, headers: { cookie: `__Host-refs_session=${token}`, origin: 'https://admin.example.com' } }
}

describe('组织治理 HTTP 门禁', () => {
  it('拒绝匿名/模板 token 与跨站请求，失败响应禁止缓存', async () => {
    const f = await fixture()
    try {
      const response = await f.app.inject({ url: '/api/v1/admin/organizations', headers: { token: 'mock-admin' } })
      expect(response.statusCode).toBe(401); expect(response.headers['cache-control']).toBe('no-store')
      expect((await f.app.inject({ method: 'POST', url: `/api/v1/admin/organizations/${f.id}/decision`,
        headers: { ...f.headers, origin: 'https://evil.example.com' }, payload: { action: 'approve', expectedVersion: 1, reason: '齐全' } })).statusCode).toBe(403)
      expect(f.service.list).not.toHaveBeenCalled(); expect(f.service.decide).not.toHaveBeenCalled()
    } finally { await f.app.close() }
  })
  it('当前 Cookie 身份贯穿查询和治理，列表响应剔除私密字段', async () => {
    const f = await fixture()
    try {
      const response = await f.app.inject({ url: '/api/v1/admin/organizations?status=pending_review&page=1', headers: f.headers })
      expect(response.statusCode).toBe(200); expect(response.json().data.items[0]).not.toHaveProperty('contact')
      expect((await f.app.inject({ url: `/api/v1/admin/organizations/${f.id}`, headers: f.headers })).json().data.contact).toBe('private@example.com')
      const input = { name: '协会', region: '上海', purpose: '培训', ownerUserId: f.actor, contact: 'email@example.com' }
      expect((await f.app.inject({ method: 'POST', url: '/api/v1/admin/organizations', headers: f.headers, payload: input })).statusCode).toBe(201)
      expect(f.service.create).toHaveBeenCalledWith(f.actor, input)
      expect((await f.app.inject({ method: 'POST', url: '/api/v1/admin/organizations', headers: f.headers,
        payload: { ...input, ownerLegalName: '不应手填实名' } })).statusCode).toBe(400)
      const decision = { action: 'approve', expectedVersion: 1, reason: '材料齐全' }
      expect((await f.app.inject({ method: 'POST', url: `/api/v1/admin/organizations/${f.id}/decision`, headers: f.headers, payload: decision })).statusCode).toBe(200)
      expect(f.service.decide).toHaveBeenCalledWith(f.actor, f.id, decision)
    } finally { await f.app.close() }
  })
  it('拒绝非法 UUID、分页、额外角色字段和无版本治理', async () => {
    const f = await fixture()
    try {
      for (const url of ['/api/v1/admin/organizations?page=0', '/api/v1/admin/organizations/not-uuid', '/api/v1/admin/organizations?pageSize=500']) {
        expect((await f.app.inject({ url, headers: f.headers })).statusCode).toBe(400)
      }
      for (const payload of [{ action: 'approve', reason: '齐全' }, { action: 'approve', expectedVersion: 1, reason: '齐全', role: 'platform_admin' },
        { action: 'dissolve', expectedVersion: 1, reason: '齐全' }]) {
        expect((await f.app.inject({ method: 'POST', url: `/api/v1/admin/organizations/${f.id}/decision`, headers: f.headers, payload })).statusCode).toBe(400)
      }
      expect(f.service.decide).not.toHaveBeenCalled()
    } finally { await f.app.close() }
  })
})
