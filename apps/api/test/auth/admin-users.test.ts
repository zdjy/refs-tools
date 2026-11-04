import { randomUUID } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import type { AdminUser } from '@refs-tools/contracts/admin-users'
import type { AdminUsersRepositories } from '../../src/modules/auth/admin-users.types.js'
import { AdminUsersService } from '../../src/modules/auth/admin-users.service.js'

function fixture() {
  const actor = randomUUID(), id = randomUUID(), now = new Date('2026-11-02T12:00:00Z')
  const user: AdminUser = { id, email: 'ref@example.com', displayName: '裁判', emailVerified: true,
    status: 'active', createdAt: now.toISOString(), version: 1, roles: [] }
  const repositories: AdminUsersRepositories = {
    users: { requireActiveActor: vi.fn(async () => true), list: vi.fn(async () => ({ items: [user], total: 1, page: 1, pageSize: 20 })),
      find: vi.fn(async () => user), create: vi.fn(async () => true), update: vi.fn(async () => true),
      remove: vi.fn(async () => true), isProtected: vi.fn(async () => false) },
    authorization: { resolveScope: vi.fn(async () => ({ type: 'platform' as const, id: null, organizationId: null,
      eventId: null, matchId: null, ownerUserId: null, organizationStatus: null, state: null })),
    findBindings: vi.fn(async () => []), isActiveMember: vi.fn(async () => false), insertBinding: vi.fn(async () => true),
    findBinding: vi.fn(async () => null), revokeBinding: vi.fn(async () => true) },
    sessions: { revokeUserSessions: vi.fn(async () => {}) },
    audit: { append: vi.fn(async () => {}), list: vi.fn(async () => ({ items: [], nextCursor: null })) },
  }
  const permissions = { isPermitted: vi.fn(() => true) }, hashPassword = vi.fn(async () => 'safe-hash')
  const service = new AdminUsersService({ transaction: { run: async (work) => work(repositories) }, permissions,
    now: () => now, passwordMinLength: 10, hashPassword })
  return { actor, id, user, repositories, permissions, hashPassword, service }
}

describe('平台用户 CRUD', () => {
  it('最小列表读取与审计共用事务', async () => {
    const f = fixture()
    expect((await f.service.list(f.actor, {})).total).toBe(1)
    expect(f.repositories.audit.append).toHaveBeenCalledWith(expect.objectContaining({ action: 'user.queried', before: null, after: null }))
  })
  it('无平台权限不得读取或写入用户', async () => {
    const f = fixture(); f.permissions.isPermitted.mockReturnValue(false)
    await expect(f.service.list(f.actor, {})).rejects.toMatchObject({ statusCode: 403 })
    await expect(f.service.create(f.actor, { email: 'new@example.com', displayName: '新用户', password: 'safe-password' })).rejects.toMatchObject({ statusCode: 403 })
    expect(f.repositories.users.list).not.toHaveBeenCalled(); expect(f.hashPassword).not.toHaveBeenCalled()
  })
  it('当前账号已失效时拒绝残余会话', async () => {
    const f = fixture(); vi.mocked(f.repositories.users.requireActiveActor).mockResolvedValue(false)
    await expect(f.service.detail(f.actor, f.id)).rejects.toMatchObject({ statusCode: 401 })
  })
  it('创建规范化邮箱，审计不含密码与个人资料', async () => {
    const f = fixture()
    await f.service.create(f.actor, { email: 'REF@EXAMPLE.COM', displayName: ' 裁判 ', password: 'safe-password' })
    expect(f.repositories.users.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'ref@example.com', displayName: '裁判', passwordHash: 'safe-hash' }), expect.any(Date))
    const audit = vi.mocked(f.repositories.audit.append).mock.calls[0]![0]
    expect(JSON.stringify(audit)).not.toMatch(/safe-password|safe-hash|ref@example/)
  })
  it('拒绝弱密码及空名称', async () => {
    const f = fixture()
    await expect(f.service.create(f.actor, { email: 'x@example.com', displayName: '新', password: 'short' })).rejects.toMatchObject({ code: 'WEAK_PASSWORD' })
    await expect(f.service.update(f.actor, f.id, { displayName: ' ', status: 'active', version: 1 })).rejects.toMatchObject({ code: 'INVALID_NAME' })
  })
  it('重复邮箱返回冲突', async () => {
    const f = fixture(); vi.mocked(f.repositories.users.create).mockResolvedValue(false)
    await expect(f.service.create(f.actor, { email: 'x@example.com', displayName: '新', password: 'safe-password' })).rejects.toMatchObject({ statusCode: 409 })
    expect(f.repositories.audit.append).not.toHaveBeenCalled()
  })
  it('KDF 完成后重新授权，撤权立即拒绝写入', async () => {
    const f = fixture(); f.hashPassword.mockImplementation(async () => { f.permissions.isPermitted.mockReturnValue(false); return 'hash' })
    await expect(f.service.create(f.actor, { email: 'x@example.com', displayName: '新', password: 'safe-password' })).rejects.toMatchObject({ statusCode: 403 })
    expect(f.repositories.users.create).not.toHaveBeenCalled()
  })
  it('停用用户撤销全部会话，恢复不恢复旧会话', async () => {
    const f = fixture()
    await f.service.update(f.actor, f.id, { displayName: '裁判', status: 'disabled', version: 1 })
    expect(f.repositories.sessions.revokeUserSessions).toHaveBeenCalledWith(f.id, expect.any(Date))
    vi.mocked(f.repositories.sessions.revokeUserSessions).mockClear()
    await f.service.update(f.actor, f.id, { displayName: '裁判', status: 'active', version: 1 })
    expect(f.repositories.sessions.revokeUserSessions).not.toHaveBeenCalled()
  })
  it('保护自己、平台管理员和组织所有者', async () => {
    const f = fixture()
    await expect(f.service.remove(f.actor, f.actor, 1)).rejects.toMatchObject({ code: 'SELF_MANAGEMENT_DENIED' })
    vi.mocked(f.repositories.users.isProtected).mockResolvedValue(true)
    await expect(f.service.remove(f.actor, f.id, 1)).rejects.toMatchObject({ code: 'PROTECTED_ACCOUNT' })
    await expect(f.service.update(f.actor, f.id, { displayName: '裁判', status: 'disabled', version: 1 })).rejects.toMatchObject({ code: 'PROTECTED_ACCOUNT' })
  })
  it('版本冲突不能覆盖新资料', async () => {
    const f = fixture()
    await expect(f.service.remove(f.actor, f.id, 2)).rejects.toMatchObject({ code: 'VERSION_CONFLICT' })
    expect(f.repositories.users.remove).not.toHaveBeenCalled()
  })
  it('逻辑删除同时撤销会话并追加审计', async () => {
    const f = fixture()
    expect(await f.service.remove(f.actor, f.id, 1)).toEqual({ deleted: true })
    expect(f.repositories.users.remove).toHaveBeenCalledWith(f.id, 1, expect.any(Date))
    expect(f.repositories.audit.append).toHaveBeenCalledWith(expect.objectContaining({ action: 'user.deleted', after: { status: 'deleted' } }))
  })
  it('不存在的用户返回 404，审计失败不能返回查询结果', async () => {
    const f = fixture(); vi.mocked(f.repositories.users.find).mockResolvedValue(null)
    await expect(f.service.detail(f.actor, f.id)).rejects.toMatchObject({ statusCode: 404 })
    vi.mocked(f.repositories.audit.append).mockRejectedValue(new Error('audit unavailable'))
    await expect(f.service.list(f.actor, {})).rejects.toThrow('audit unavailable')
  })
})
