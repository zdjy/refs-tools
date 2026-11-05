import { randomUUID } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import type { ScopedRoleBinding } from '@refs-tools/contracts/authorization'
import { accessFixture } from './access-fixture.js'

const binding = (f: ReturnType<typeof accessFixture>, patch: Partial<ScopedRoleBinding> = {}): ScopedRoleBinding => ({ id: randomUUID(),
  subjectUserId: f.user, role: 'organizer', scopeType: 'organization', scopeId: f.id, grantedBy: f.actor, startsAt: f.now.toISOString(),
  expiresAt: null, revokedAt: null, ...patch })
/** 按主体返回绑定：actor 仅是 organizer，admin 仅有平台角色，其余人没有任何绑定。 */
function asOrganizer(f: ReturnType<typeof accessFixture>, admin: string) {
  vi.mocked(f.r.authorization.findBindings).mockImplementation(async subject => subject === f.actor ? [binding(f, { subjectUserId: f.actor })]
    : subject === admin ? [binding(f, { subjectUserId: admin, role: 'platform_admin', scopeType: 'platform', scopeId: null })] : [])
}

describe('组织角色授予与撤销', () => {
  it('owner 授予 organizer 并写角色审计，目标必须是有效正式成员', async () => {
    const f = accessFixture(); const role = await f.roles.grant(f.actor, f.id, { userId: f.user, role: 'organizer' })
    expect(role).toMatchObject({ userId: f.user, role: 'organizer' })
    expect(vi.mocked(f.r.audit.append).mock.calls.map(c => c[0].action)).toContain('role.granted')
    vi.mocked(f.r.authorization.isActiveMember).mockImplementation(async (user) => user === f.actor)
    await expect(f.roles.grant(f.actor, f.id, { userId: f.user, role: 'certifier' })).rejects.toMatchObject({ code: 'TARGET_NOT_MEMBER' })
  })
  it('organizer 可管理成员但不能授予或撤销角色，平台管理员也不能', async () => {
    const f = accessFixture(), admin = randomUUID(); asOrganizer(f, admin)
    await expect(f.roles.grant(f.actor, f.id, { userId: f.user, role: 'certifier' })).rejects.toMatchObject({ statusCode: 404 })
    await expect(f.roles.revoke(f.actor, f.id, randomUUID())).rejects.toMatchObject({ statusCode: 404 })
    expect((await f.roles.list(f.actor, f.id)).canGrant).toBe(false)
    expect((await f.roles.list(admin, f.id)).canGrant).toBe(false)
    expect(f.r.authorization.insertBinding).not.toHaveBeenCalled()
  })
  it('角色列表透传分页参数，并仍附带 canGrant', async () => {
    const f = accessFixture()
    const result = await f.roles.list(f.actor, f.id, { page: '2', pageSize: '10' })
    expect(f.r.roles.list).toHaveBeenCalledWith(f.id, { page: '2', pageSize: '10' }, f.now)
    expect(result).toMatchObject({ items: [], total: 0, page: 1, pageSize: 100 })
    expect(result).toHaveProperty('canGrant')
  })
  it('已持有的角色不能重复授予', async () => {
    const f = accessFixture(); vi.mocked(f.r.authorization.insertBinding).mockResolvedValue(false)
    await expect(f.roles.grant(f.actor, f.id, { userId: f.user, role: 'organizer' })).rejects.toMatchObject({ code: 'ROLE_ALREADY_BOUND', statusCode: 409 })
  })
  it('撤销只作用于本组织的 organizer/certifier；owner、跨组织、不存在一律 404', async () => {
    const f = accessFixture()
    for (const patch of [{ role: 'owner' as const }, { scopeId: randomUUID() }, { scopeType: 'platform' as const, scopeId: null, role: 'platform_admin' as const }]) {
      vi.mocked(f.r.authorization.findBinding).mockResolvedValue(binding(f, patch))
      await expect(f.roles.revoke(f.actor, f.id, randomUUID())).rejects.toMatchObject({ statusCode: 404 })
    }
    vi.mocked(f.r.authorization.findBinding).mockResolvedValue(null)
    await expect(f.roles.revoke(f.actor, f.id, randomUUID())).rejects.toMatchObject({ statusCode: 404 })
    expect(f.r.authorization.revokeBinding).not.toHaveBeenCalled()
  })
  it('撤销写审计；重复撤销幂等且不重复审计', async () => {
    const f = accessFixture(); const target = binding(f)
    vi.mocked(f.r.authorization.findBinding).mockResolvedValue(target)
    expect(await f.roles.revoke(f.actor, f.id, target.id)).toEqual({ revoked: true })
    expect(vi.mocked(f.r.audit.append).mock.calls.filter(c => c[0].action === 'role.revoked')).toHaveLength(1)
    vi.mocked(f.r.authorization.revokeBinding).mockResolvedValue(false)
    expect(await f.roles.revoke(f.actor, f.id, target.id)).toEqual({ revoked: true })
    expect(vi.mocked(f.r.audit.append).mock.calls.filter(c => c[0].action === 'role.revoked')).toHaveLength(1)
  })
})

describe('邀请候选人检索', () => {
  it('过短关键词拒绝且不查询；合法检索写审计但不记录关键词', async () => {
    const f = accessFixture()
    await expect(f.candidates.search(f.actor, f.id, { keyword: ' a ' })).rejects.toMatchObject({ code: 'KEYWORD_TOO_SHORT' })
    expect(f.r.candidates.search).not.toHaveBeenCalled()
    await f.candidates.search(f.actor, f.id, { keyword: ' Alice@Example.com ' })
    expect(f.r.candidates.search).toHaveBeenCalledWith(f.id, f.actor, 'alice@example.com', 1, f.now)
    expect(JSON.stringify(vi.mocked(f.r.audit.append).mock.calls)).not.toContain('alice')
  })
  it('无成员管理权限时不能检索', async () => {
    const f = accessFixture(); vi.mocked(f.r.authorization.findBindings).mockResolvedValue([])
    await expect(f.candidates.search(f.user, f.id, { keyword: 'alice' })).rejects.toMatchObject({ statusCode: 404 })
    expect(f.r.candidates.search).not.toHaveBeenCalled()
  })
})
