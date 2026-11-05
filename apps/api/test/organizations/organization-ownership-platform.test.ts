import { randomUUID } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { accessFixture } from './access-fixture.js'

const actions = (f: ReturnType<typeof accessFixture>) => vi.mocked(f.r.audit.append).mock.calls.map(call => call[0].action)
const input = (f: ReturnType<typeof accessFixture>) => ({ toUserId: f.actor, expectedVersion: 1, reason: '原负责人失联' })
/** 夹具中 f.user 是平台管理员；把 f.actor 当作被指定的新负责人。 */
function platformFixture() {
  const f = accessFixture(); f.organization.ownerUserId = f.user
  vi.mocked(f.r.authorization.insertBinding).mockResolvedValue(true)
  return f
}

describe('平台管理员直接移交所有权', () => {
  it('无需接收人确认：换 owner、角色交接并写带理由的审计', async () => {
    const f = platformFixture(); await f.ownership.platformTransfer(f.user, f.id, input(f))
    expect(f.r.organizations.changeOwner).toHaveBeenCalledWith(f.id, 1, f.actor, '张三', '+8613800138000')
    const audit = vi.mocked(f.r.audit.append).mock.calls.map(call => call[0]).find(item => item.action === 'organization.ownership_transferred')!
    expect(audit).toMatchObject({ reason: '原负责人失联', scopeType: 'organization', scopeId: f.id,
      before: { subjectUserId: f.user, version: 1 }, after: { subjectUserId: f.actor, version: 2 } })
    expect(f.r.ownership.decide).not.toHaveBeenCalled()
  })
  it('冻结组织可由平台移交，待审核、已驳回和已解散不可', async () => {
    const f = platformFixture(); f.organization.status = 'frozen'
    await expect(f.ownership.platformTransfer(f.user, f.id, input(f))).resolves.toBeDefined()
    for (const status of ['pending_review', 'rejected', 'dissolved'] as const) {
      f.organization.status = status
      await expect(f.ownership.platformTransfer(f.user, f.id, input(f))).rejects.toMatchObject({ code: 'INVALID_ORGANIZATION_STATE' })
    }
  })
  it('理由必填；组织版本过期要求重新读取；非平台管理员 403', async () => {
    const f = platformFixture()
    await expect(f.ownership.platformTransfer(f.user, f.id, { ...input(f), reason: '  ' })).rejects.toMatchObject({ code: 'REASON_REQUIRED' })
    await expect(f.ownership.platformTransfer(f.user, f.id, { ...input(f), expectedVersion: 9 })).rejects.toMatchObject({ code: 'VERSION_CONFLICT' })
    vi.mocked(f.r.authorization.findBindings).mockResolvedValue([])
    await expect(f.ownership.platformTransfer(f.user, f.id, input(f))).rejects.toMatchObject({ statusCode: 403 })
    expect(f.r.organizations.changeOwner).not.toHaveBeenCalled()
  })
  it('换 owner 未命中版本时整笔失败，不留下角色变更之外的成功结果', async () => {
    const f = platformFixture(); vi.mocked(f.r.organizations.changeOwner).mockResolvedValue(false)
    await expect(f.ownership.platformTransfer(f.user, f.id, input(f))).rejects.toMatchObject({ code: 'VERSION_CONFLICT' })
    expect(actions(f)).not.toContain('organization.ownership_transferred')
  })
  it('取代仍待处理的负责人请求，并为每条写审计', async () => {
    const f = platformFixture(); vi.mocked(f.r.ownership.supersedePending).mockResolvedValue([{ id: randomUUID(), version: 2 }])
    await f.ownership.platformTransfer(f.user, f.id, input(f))
    expect(actions(f).filter(action => action === 'ownership_transfer.changed')).toHaveLength(1)
  })
  it('新负责人须为 active 成员且资料完整，且不能是当前负责人', async () => {
    const f = platformFixture()
    await expect(f.ownership.platformTransfer(f.user, f.id, { ...input(f), toUserId: f.user })).rejects.toMatchObject({ code: 'SAME_OWNER' })
    vi.mocked(f.r.authorization.isActiveMember).mockResolvedValue(false)
    await expect(f.ownership.platformTransfer(f.user, f.id, input(f))).rejects.toMatchObject({ code: 'NOT_ACTIVE_MEMBER' })
  })
})

describe('移交记录读取', () => {
  it('负责人可读组织记录并写查询审计；收件箱只读本人数据', async () => {
    const f = accessFixture(); await f.ownership.list(f.actor, f.id)
    expect(actions(f)).toEqual(['ownership_transfer.queried'])
    await f.ownership.incoming(f.user)
    expect(f.r.ownership.incoming).toHaveBeenCalledWith(f.user, {}, f.now)
    expect(actions(f)).toEqual(['ownership_transfer.queried'])
  })
})
