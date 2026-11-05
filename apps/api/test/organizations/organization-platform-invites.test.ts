import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { accessFixture } from './access-fixture.js'

const input = { name: '新协会', region: '浙江省/杭州市/西湖区', purpose: '培训' }
const token = `ro_${'B'.repeat(43)}`
const actions = (f: ReturnType<typeof accessFixture>) => vi.mocked(f.r.audit.append).mock.calls.map(call => call[0].action)

describe('平台创建邀请码（管理端）', () => {
  it('创建只落哈希与末 4 位提示，明文仅在响应出现一次，不进入审计', async () => {
    const f = accessFixture(); const result = await f.platformInvites.create(f.user, { validDays: 3 })
    expect(result.token).toMatch(/^ro_[A-Za-z0-9_-]{43}$/)
    const [saved, , expires] = vi.mocked(f.r.platformInvites.create).mock.calls[0]!
    expect(saved.tokenHash).toBe(createHash('sha256').update(result.token).digest('hex'))
    expect(saved.hint).toBe(result.token.slice(-4))
    expect(expires.getTime() - f.now.getTime()).toBe(3 * 86_400_000)
    expect(JSON.stringify(vi.mocked(f.r.audit.append).mock.calls)).not.toContain(result.token)
    expect(JSON.stringify(result.invite)).not.toContain(saved.tokenHash)
  })
  it('非平台管理员不能创建、列出或撤销，也不会写入', async () => {
    const f = accessFixture()
    for (const action of [() => f.platformInvites.create(f.actor, { validDays: 3 }), () => f.platformInvites.list(f.actor, {}),
      () => f.platformInvites.revoke(f.actor, f.invite.id, { expectedVersion: 1 })]) {
      await expect(action()).rejects.toMatchObject({ statusCode: 403 })
    }
    expect(f.r.platformInvites.create).not.toHaveBeenCalled()
    expect(f.r.platformInvites.revoke).not.toHaveBeenCalled()
  })
  it('撤销按版本条件执行；陈旧版本冲突，已使用或已撤销的码不可再撤销', async () => {
    const f = accessFixture()
    await expect(f.platformInvites.revoke(f.user, f.invite.id, { expectedVersion: 9 })).rejects.toMatchObject({ code: 'VERSION_CONFLICT' })
    await f.platformInvites.revoke(f.user, f.invite.id, { expectedVersion: 1 })
    expect(f.r.platformInvites.revoke).toHaveBeenCalledWith(f.invite.id, 1, f.now)
    for (const status of ['used', 'revoked', 'expired'] as const) {
      vi.mocked(f.r.platformInvites.find).mockResolvedValue({ ...f.invite, status })
      await expect(f.platformInvites.revoke(f.user, f.invite.id, { expectedVersion: 1 })).rejects.toMatchObject({ code: 'INVALID_PLATFORM_INVITE_STATE' })
    }
    vi.mocked(f.r.platformInvites.find).mockResolvedValue(null)
    await expect(f.platformInvites.revoke(f.user, f.invite.id, { expectedVersion: 1 })).rejects.toMatchObject({ statusCode: 404 })
  })
  it('列表读取同事务写查询审计', async () => {
    const f = accessFixture(); await f.platformInvites.list(f.user, {})
    expect(actions(f)).toEqual(['platform_invite.queried'])
  })
})
