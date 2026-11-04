import { describe, expect, it, vi } from 'vitest'
import { buildApp } from '../../src/app.js'
import { DomainError } from '../../src/application/errors.js'
import { memberFixture } from './members-fixture.js'

async function fixture() {
  const f = memberFixture(), token = 'a'.repeat(43), origin = 'https://admin.example.com'
  const app = await buildApp({}, { organizationMembers: { members: f.members, invitations: f.invitations, publicOrigin: origin,
    sessions: { requireVerifiedSession: async value => {
      if (value !== token) throw new DomainError('UNAUTHENTICATED', '请重新登录', 401)
      return { user: { id: f.actor, email: 'admin@example.com', displayName: '管理员', emailVerified: true, hasPassword: true, avatarMediaId: null }, expiresAt: f.now.toISOString() }
    } } } })
  return { ...f, app, headers: { cookie: `__Host-refs_session=${token}`, origin } }
}

describe('组织成员 HTTP 边界', () => {
  it('匿名与跨站拒绝且禁止缓存，不能伪造操作者', async () => {
    const f = await fixture()
    try {
      const anonymous = await f.app.inject({ url: `/api/v1/organizations/${f.id}/memberships` })
      expect(anonymous.statusCode).toBe(401); expect(anonymous.headers['cache-control']).toBe('no-store')
      expect((await f.app.inject({ method: 'POST', url: `/api/v1/organizations/${f.id}/invitations`, headers: { ...f.headers, origin: 'https://evil.example.com' },
        payload: { userId: f.user, validDays: 7 } })).statusCode).toBe(403)
      expect(f.r.members.createInvitation).not.toHaveBeenCalled()
    } finally { await f.app.close() }
  })
  it('合法路径使用当前 Cookie 主体，响应只包含契约字段', async () => {
    const f = await fixture()
    try {
      const response = await f.app.inject({ url: `/api/v1/organizations/${f.id}/memberships?page=1&pageSize=20`, headers: f.headers })
      expect(response.statusCode).toBe(200); expect(response.json().data).toMatchObject({ canManage: true, total: 1 })
      const created = await f.app.inject({ method: 'POST', url: `/api/v1/organizations/${f.id}/invitations`, headers: f.headers, payload: { userId: f.user } })
      expect(created.statusCode).toBe(201)
      expect(f.r.members.createInvitation).toHaveBeenCalledWith(expect.any(String), f.id, f.user, f.actor, f.now, new Date(f.now.getTime() + 7 * 86400000))
      expect((await f.app.inject({ method: 'POST', url: `/api/v1/organizations/${f.id}/invitations/${f.invitation.id}/accept`, headers: f.headers })).statusCode).toBe(404)
      const inbox = await f.app.inject({ url: '/api/v1/me/organization-invitations', headers: f.headers })
      expect(inbox.statusCode).toBe(200); expect(f.r.members.invitations).toHaveBeenCalledWith({ userId: f.actor }, {}, f.now)
    } finally { await f.app.close() }
  })
  it('非法 ID、分页、越界有效期与附加角色拒绝', async () => {
    const f = await fixture()
    try {
      for (const url of [`/api/v1/organizations/invalid/memberships`, `/api/v1/organizations/${f.id}/invitations?pageSize=500`]) {
        expect((await f.app.inject({ url, headers: f.headers })).statusCode).toBe(400)
      }
      for (const payload of [{ userId: f.user, validDays: 0 }, { userId: f.user, validDays: 31 }, { userId: f.user, validDays: 7, role: 'owner' }]) {
        expect((await f.app.inject({ method: 'POST', url: `/api/v1/organizations/${f.id}/invitations`, headers: f.headers, payload })).statusCode).toBe(400)
      }
      expect((await f.app.inject({ method: 'POST', url: `/api/v1/organizations/${f.id}/memberships/${f.member.id}/decision`, headers: f.headers,
        payload: { action: 'approve', reason: '批准' } })).statusCode).toBe(400)
      expect(vi.mocked(f.r.members.createInvitation)).not.toHaveBeenCalled()
    } finally { await f.app.close() }
  })
})
