import { describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app.js'
import { DomainError } from '../../src/application/errors.js'
import { accessFixture } from './access-fixture.js'

const inviteToken = `ro_${'B'.repeat(43)}`
const joinToken = `rj_${'B'.repeat(43)}`
const input = { name: '新协会', region: '浙江省/杭州市/西湖区', purpose: '培训' }

/** 当前会话主体默认是平台管理员 f.user，便于同时覆盖管理端与用户端路由。 */
async function fixture() {
  const f = accessFixture(), cookie = 'a'.repeat(43), origin = 'https://app.example.com'
  const sessions = { requireVerifiedSession: async (value: string | undefined) => {
    if (value !== cookie) throw new DomainError('UNAUTHENTICATED', '请重新登录', 401)
    return { user: { id: f.user, email: 'a@example.com', displayName: '甲', emailVerified: true, hasPassword: true, avatarMediaId: null }, expiresAt: f.now.toISOString() }
  } }
  const app = await buildApp({}, {
    organizationAccess: { self: f.self, joinCodes: f.joinCodes, roles: f.roles, candidates: f.candidates, publicOrigin: origin, sessions },
    platformInvites: { service: f.platformInvites, publicOrigin: origin, sessions },
    organizationOwnership: { service: f.ownership, publicOrigin: origin, sessions },
  })
  return { ...f, app, headers: { cookie: `__Host-refs_session=${cookie}`, origin } }
}

describe('平台邀请码与成员码用途隔离（HTTP 入口）', () => {
  it('申请接口拒绝成员码前缀，成员码兑换接口拒绝平台邀请码前缀，且不触达业务', async () => {
    const f = await fixture()
    try {
      const apply = (platformInviteToken: string) => f.app.inject({ method: 'POST', url: '/api/v1/me/organization-applications', headers: f.headers,
        payload: { ...input, platformInviteToken } })
      expect((await apply(joinToken)).statusCode).toBe(400)
      expect((await apply('ro_short')).statusCode).toBe(400)
      expect((await f.app.inject({ method: 'POST', url: '/api/v1/organization-join-codes/redeem', headers: f.headers, payload: { token: inviteToken } })).statusCode).toBe(400)
      expect(f.r.platformInvites.consume).not.toHaveBeenCalled(); expect(f.r.joinCodes.consume).not.toHaveBeenCalled()
      expect(f.r.self.apply).not.toHaveBeenCalled()
    } finally { await f.app.close() }
  })
  it('合法邀请码格式进入业务；无邀请码的申请保持待审核', async () => {
    const f = await fixture()
    try {
      const plain = await f.app.inject({ method: 'POST', url: '/api/v1/me/organization-applications', headers: f.headers, payload: input })
      expect(plain.statusCode).toBe(201); expect(plain.json().data.status).toBe('pending_review')
      expect(f.r.platformInvites.consume).not.toHaveBeenCalled()
    } finally { await f.app.close() }
  })
})
