import { randomUUID } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { buildApp } from '../../src/app.js'
import { DomainError } from '../../src/application/errors.js'
import type { AdminUsersService } from '../../src/modules/auth/admin-users.service.js'

async function fixture() {
  const id = randomUUID(), token = 'a'.repeat(43)
  const user = { id, email: 'ref@example.com', displayName: '裁判', emailVerified: true,
    status: 'active', createdAt: new Date().toISOString(), version: 1, roles: [] }
  const service = { checkAccess: vi.fn(async () => {}),
    list: vi.fn(async () => ({ items: [user], total: 1, page: 1, pageSize: 20 })), detail: vi.fn(async () => user),
    create: vi.fn(async () => user), update: vi.fn(async () => user), remove: vi.fn(async () => ({ deleted: true })) }
  const sessions = { requireVerifiedSession: vi.fn(async (value: string | undefined) => {
    if (value !== token) throw new DomainError('UNAUTHENTICATED', '请重新登录', 401)
    return { user: { id, email: user.email, displayName: user.displayName, emailVerified: true, hasPassword: true, avatarMediaId: null }, expiresAt: new Date().toISOString() }
  }) }
  const app = await buildApp({}, { adminUsers: { service: service as unknown as AdminUsersService,
    sessions, publicOrigin: 'https://admin.example.com' } })
  return { app, service, user, id, headers: { cookie: `__Host-refs_session=${token}`, origin: 'https://admin.example.com' } }
}

describe('管理用户 HTTP 边界', () => {
  it('拒绝匿名和模板 token，拒绝响应同样 no-store', async () => {
    const f = await fixture()
    try {
      const response = await f.app.inject({ url: '/api/v1/admin/users', headers: { token: 'mock-admin' } })
      expect(response.statusCode).toBe(401); expect(response.headers['cache-control']).toBe('no-store')
      expect(f.service.list).not.toHaveBeenCalled()
    } finally { await f.app.close() }
  })
  it('查询、详情、创建、编辑与删除传递当前 Cookie 身份', async () => {
    const f = await fixture()
    try {
      expect((await f.app.inject({ url: '/api/v1/admin/users?page=1&pageSize=20', headers: f.headers })).statusCode).toBe(200)
      expect((await f.app.inject({ url: `/api/v1/admin/users/${f.id}`, headers: f.headers })).json().data.id).toBe(f.id)
      expect((await f.app.inject({ method: 'POST', url: '/api/v1/admin/users', headers: f.headers,
        payload: { email: 'new@example.com', displayName: '新裁判', password: 'safe-password' } })).statusCode).toBe(201)
      expect((await f.app.inject({ method: 'PATCH', url: `/api/v1/admin/users/${f.id}`, headers: f.headers,
        payload: { displayName: '新裁判', status: 'active', version: 1 } })).statusCode).toBe(200)
      expect((await f.app.inject({ method: 'DELETE', url: `/api/v1/admin/users/${f.id}`, headers: f.headers,
        payload: { version: 1 } })).json()).toEqual({ data: { deleted: true } })
      expect(f.service.remove).toHaveBeenCalledWith(f.id, f.id, 1)
    } finally { await f.app.close() }
  })
  it('拒绝跨站写入、伪造角色、任意邮箱变更和非法分页', async () => {
    const f = await fixture()
    try {
      const url = `/api/v1/admin/users/${f.id}`
      expect((await f.app.inject({ method: 'DELETE', url, headers: { ...f.headers, origin: 'https://evil.example.com' }, payload: { version: 1 } })).statusCode).toBe(403)
      expect((await f.app.inject({ method: 'PATCH', url, headers: f.headers,
        payload: { displayName: '裁判', status: 'active', version: 1, role: 'platform_admin' } })).statusCode).toBe(400)
      expect((await f.app.inject({ method: 'PATCH', url, headers: f.headers,
        payload: { displayName: '裁判', status: 'active', version: 1, email: 'changed@example.com' } })).statusCode).toBe(400)
      expect((await f.app.inject({ url: '/api/v1/admin/users?page=0', headers: f.headers })).statusCode).toBe(400)
      expect(f.service.update).not.toHaveBeenCalled(); expect(f.service.remove).not.toHaveBeenCalled()
    } finally { await f.app.close() }
  })
})
