import { describe, expect, it, vi } from 'vitest'
import { buildApp } from '../../src/app.js'
import { DomainError } from '../../src/application/errors.js'
import { accessFixture } from './access-fixture.js'

const token = `rj_${'B'.repeat(43)}`

async function fixture() {
  const f = accessFixture(), cookie = 'a'.repeat(43), origin = 'https://app.example.com'
  const app = await buildApp({}, { organizationAccess: { self: f.self, joinCodes: f.joinCodes, roles: f.roles, candidates: f.candidates, publicOrigin: origin,
    sessions: { requireVerifiedSession: async value => {
      if (value !== cookie) throw new DomainError('UNAUTHENTICATED', '请重新登录', 401)
      return { user: { id: f.actor, email: 'a@example.com', displayName: '甲', emailVerified: true, hasPassword: true, avatarMediaId: null }, expiresAt: f.now.toISOString() }
    } } } })
  return { ...f, app, headers: { cookie: `__Host-refs_session=${cookie}`, origin } }
}

describe('用户视角组织 HTTP 边界', () => {
  it('匿名与跨站请求被拒绝，所有响应禁止缓存', async () => {
    const f = await fixture()
    try {
      const anonymous = await f.app.inject({ url: '/api/v1/me/organizations' })
      expect(anonymous.statusCode).toBe(401); expect(anonymous.headers['cache-control']).toBe('no-store')
      const cross = await f.app.inject({ method: 'POST', url: '/api/v1/organization-join-codes/redeem', headers: { ...f.headers, origin: 'https://evil.example.com' }, payload: { token } })
      expect(cross.statusCode).toBe(403); expect(f.r.joinCodes.consume).not.toHaveBeenCalled()
    } finally { await f.app.close() }
  })
  it('合法请求使用会话主体；创建成员码返回 201 并仅此一次带明文', async () => {
    const f = await fixture()
    try {
      const mine = await f.app.inject({ url: '/api/v1/me/organizations', headers: f.headers })
      expect(mine.statusCode).toBe(200)
      // 列表一律带分页信封；默认值属于服务端，客户端不传也必须有 total/page/pageSize。
      expect(mine.json().data).toMatchObject({ total: 0, page: 1, pageSize: 100 })
      const created = await f.app.inject({ method: 'POST', url: `/api/v1/organizations/${f.id}/join-codes`, headers: f.headers, payload: { validDays: 7, maxUses: 1 } })
      expect(created.statusCode).toBe(201); expect(created.json().data.token).toMatch(/^rj_/)
      const listed = await f.app.inject({ url: `/api/v1/organizations/${f.id}/join-codes`, headers: f.headers })
      expect(listed.statusCode).toBe(200); expect(listed.body).not.toContain('token')
      const redeemed = await f.app.inject({ method: 'POST', url: '/api/v1/organization-join-codes/redeem', headers: f.headers, payload: { token } })
      expect(redeemed.statusCode).toBe(200)
    } finally { await f.app.close() }
  })
  it('非法成员码、越界参数、多余字段与非法角色一律 400，且不触达业务', async () => {
    const f = await fixture()
    try {
      for (const payload of [{ token: 'rj_short' }, { token: `x${token}` }, { token, extra: 1 }]) {
        expect((await f.app.inject({ method: 'POST', url: '/api/v1/organization-join-codes/redeem', headers: f.headers, payload })).statusCode).toBe(400)
      }
      for (const payload of [{ validDays: 0, maxUses: 1 }, { validDays: 7, maxUses: 101 }, { validDays: 7, maxUses: 1, role: 'owner' }]) {
        expect((await f.app.inject({ method: 'POST', url: `/api/v1/organizations/${f.id}/join-codes`, headers: f.headers, payload })).statusCode).toBe(400)
      }
      expect((await f.app.inject({ method: 'POST', url: `/api/v1/organizations/${f.id}/roles`, headers: f.headers, payload: { userId: f.user, role: 'owner' } })).statusCode).toBe(400)
      expect((await f.app.inject({ url: `/api/v1/organizations/${f.id}/member-candidates?keyword=a`, headers: f.headers })).statusCode).toBe(400)
      expect((await f.app.inject({ url: '/api/v1/organization-directory?pageSize=500', headers: f.headers })).statusCode).toBe(400)
      // 分页参数越界与非法 page 同样在 HTTP 边界被拒绝，不触达业务。
      expect((await f.app.inject({ url: '/api/v1/me/organizations?page=0', headers: f.headers })).statusCode).toBe(400)
      expect((await f.app.inject({ url: `/api/v1/organizations/${f.id}/join-codes?pageSize=1000`, headers: f.headers })).statusCode).toBe(400)
      expect(f.r.joinCodes.consume).not.toHaveBeenCalled(); expect(f.r.joinCodes.create).not.toHaveBeenCalled()
    } finally { await f.app.close() }
  })
  it('自助申请 201，缺字段 400；角色撤销与候选人检索可达', async () => {
    const f = await fixture()
    try {
      const body = { name: '协会', region: '浙江省/杭州市/西湖区', purpose: '培训' }
      expect((await f.app.inject({ method: 'POST', url: '/api/v1/me/organization-applications', headers: f.headers, payload: body })).statusCode).toBe(201)
      // 负责人实名与联系方式只取自账户资料，请求体携带这两个字段一律 400，且不触发写入。
      const writes = vi.mocked(f.r.self.apply).mock.calls.length
      for (const extra of [{ ownerLegalName: '张三' }, { contact: '1380000' }]) {
        expect((await f.app.inject({ method: 'POST', url: '/api/v1/me/organization-applications', headers: f.headers,
          payload: { ...body, ...extra } })).statusCode).toBe(400)
      }
      expect(vi.mocked(f.r.self.apply).mock.calls).toHaveLength(writes)
      expect((await f.app.inject({ method: 'POST', url: '/api/v1/me/organization-applications', headers: f.headers, payload: { name: '协会' } })).statusCode).toBe(400)
      const search = await f.app.inject({ url: `/api/v1/organizations/${f.id}/member-candidates?keyword=al`, headers: f.headers })
      expect(search.statusCode).toBe(200); expect(search.json().data.items).toEqual([])
      // 负责人自助修改简介：只接受 purpose 与 expectedVersion，回执为新版本的最小投影。
      const updated = await f.app.inject({ method: 'PATCH', url: `/api/v1/organizations/${f.id}/profile`, headers: f.headers,
        payload: { purpose: ' 新简介 ', expectedVersion: 1 } })
      expect(updated.statusCode).toBe(200); expect(updated.json().data).toEqual({ id: f.id, purpose: '新简介', version: 2 })
      for (const payload of [{ purpose: '新简介' }, { purpose: '新简介', expectedVersion: 0 }, { purpose: '新简介', expectedVersion: 1, name: '改名' }]) {
        expect((await f.app.inject({ method: 'PATCH', url: `/api/v1/organizations/${f.id}/profile`, headers: f.headers, payload })).statusCode).toBe(400)
      }
      expect(f.r.self.updatePurpose).toHaveBeenCalledTimes(1)
    } finally { await f.app.close() }
  })
})
