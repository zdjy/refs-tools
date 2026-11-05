import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { accessFixture } from './access-fixture.js'

const token = `rj_${'A'.repeat(43)}`

describe('成员码', () => {
  it('创建只落哈希与末 4 位提示，明文仅在响应出现一次，不进入审计', async () => {
    const f = accessFixture(); const result = await f.joinCodes.create(f.actor, f.id, { validDays: 7, maxUses: 2 })
    expect(result.token).toMatch(/^rj_[A-Za-z0-9_-]{43}$/)
    const saved = vi.mocked(f.r.joinCodes.create).mock.calls[0]![0]
    expect(saved.tokenHash).toBe(createHash('sha256').update(result.token).digest('hex'))
    expect(saved.hint).toBe(result.token.slice(-4))
    expect(JSON.stringify(vi.mocked(f.r.audit.append).mock.calls)).not.toContain(result.token)
    expect(JSON.stringify(result.code)).not.toContain(saved.tokenHash)
  })
  it('同时有效的成员码达到上限后拒绝创建', async () => {
    const f = accessFixture(); vi.mocked(f.r.joinCodes.countActive).mockResolvedValue(10)
    await expect(f.joinCodes.create(f.actor, f.id, { validDays: 7, maxUses: 1 })).rejects.toMatchObject({ code: 'JOIN_CODE_LIMIT', statusCode: 409 })
    expect(f.r.joinCodes.create).not.toHaveBeenCalled()
  })
  it('没有成员管理权限的成员不能创建、列出或撤销', async () => {
    const f = accessFixture()
    for (const action of [() => f.joinCodes.create(f.user, f.id, { validDays: 7, maxUses: 1 }), () => f.joinCodes.list(f.user, f.id),
      () => f.joinCodes.revoke(f.user, f.id, f.code.id, { expectedVersion: 1 })]) {
      vi.mocked(f.r.authorization.findBindings).mockResolvedValue([])
      await expect(action()).rejects.toMatchObject({ statusCode: 404 })
    }
  })
  it('兑换建立 active 成员关系，同时写入成员与成员码审计，不授予角色', async () => {
    const f = accessFixture(); const member = await f.joinCodes.redeem(f.user, token)
    expect(f.r.joinCodes.consume).toHaveBeenCalledWith(createHash('sha256').update(token).digest('hex'), f.id, f.now)
    expect(member.status).toBe('active')
    expect(vi.mocked(f.r.audit.append).mock.calls.map(c => c[0].action).sort()).toEqual(['join_code.changed', 'membership.changed'])
    expect(f.r.authorization.insertBinding).not.toHaveBeenCalled()
  })
  it('已是正式成员时幂等返回且不消耗次数；未知或失效码统一为同一错误', async () => {
    const f = accessFixture(); vi.mocked(f.r.members.current).mockResolvedValue({ ...f.member, status: 'active' })
    expect((await f.joinCodes.redeem(f.user, token)).status).toBe('active')
    expect(f.r.joinCodes.consume).not.toHaveBeenCalled()
    vi.mocked(f.r.members.current).mockResolvedValue(null)
    vi.mocked(f.r.joinCodes.consume).mockResolvedValue(null)
    await expect(f.joinCodes.redeem(f.user, token)).rejects.toMatchObject({ code: 'JOIN_CODE_INVALID', statusCode: 422 })
    vi.mocked(f.r.joinCodes.organizationOf).mockResolvedValue(null)
    await expect(f.joinCodes.redeem(f.user, token)).rejects.toMatchObject({ code: 'JOIN_CODE_INVALID', statusCode: 422 })
  })
  it('组织已冻结或账号失效时不能兑换', async () => {
    const f = accessFixture(); f.organization.status = 'frozen'
    await expect(f.joinCodes.redeem(f.user, token)).rejects.toMatchObject({ code: 'ORGANIZATION_INACTIVE' })
    f.organization.status = 'active'; vi.mocked(f.r.identities.requireActiveActor).mockResolvedValue(false)
    await expect(f.joinCodes.redeem(f.user, token)).rejects.toMatchObject({ statusCode: 401 })
    expect(f.r.joinCodes.consume).not.toHaveBeenCalled()
  })
  it('撤销按版本条件执行，过期版本冲突，重复撤销被拒绝', async () => {
    const f = accessFixture()
    await expect(f.joinCodes.revoke(f.actor, f.id, f.code.id, { expectedVersion: 9 })).rejects.toMatchObject({ code: 'VERSION_CONFLICT' })
    await f.joinCodes.revoke(f.actor, f.id, f.code.id, { expectedVersion: 1 })
    expect(f.r.joinCodes.revoke).toHaveBeenCalledWith(f.code.id, 1, f.now)
    vi.mocked(f.r.joinCodes.find).mockResolvedValue({ ...f.code, status: 'revoked' })
    await expect(f.joinCodes.revoke(f.actor, f.id, f.code.id, { expectedVersion: 1 })).rejects.toMatchObject({ code: 'INVALID_JOIN_CODE_STATE' })
  })
})
