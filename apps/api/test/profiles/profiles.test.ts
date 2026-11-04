import { describe, expect, it } from 'vitest'
import type { Profile } from '@refs-tools/contracts/profile'
import type { AuditRepository } from '../../src/modules/audit/audit.types.js'
import { ProfilesService } from '../../src/modules/profiles/profiles.service.js'
import type { ProfilesRepository, ProfileWrite } from '../../src/modules/profiles/profiles.types.js'

const userId = '11111111-1111-4111-8111-111111111111'
const avatarId = '22222222-2222-4222-8222-222222222222'
const base: Profile = {
  userId, nickname: '裁判甲', legalName: null, phone: null, regionCode: null, regionLabel: null,
  addressDetail: null, birthDate: null, avatarMediaId: null, version: 1,
}

function harness() {
  const state = { profile: { ...base } as Profile, avatars: new Set<string>(), saves: 0,
    audits: [] as { actorUserId: string; action: string; before: unknown; after: unknown }[] }
  const profiles: ProfilesRepository = {
    async find(id) { return state.profile.userId === id ? { ...state.profile } : null },
    async save(id, expectedVersion, next: ProfileWrite) {
      if (state.profile.version !== expectedVersion) return false
      state.saves++
      state.profile = { ...next, userId: id, version: expectedVersion + 1 }
      return true
    },
    async ownedAvatar(_id, mediaId) { return state.avatars.has(mediaId) },
  }
  const audit: AuditRepository = {
    async append(event) { state.audits.push(event) },
    async list() { return { items: [], nextCursor: null } },
  }
  const service = new ProfilesService({
    transaction: { run: (work) => work({ profiles, audit }) },
    now: () => new Date('2026-11-02T03:00:00.000Z'),
  })
  return { service, state }
}

describe('裁判档案用例', () => {
  it('读取返回当前投影，未知或在用账号返回 401', async () => {
    const h = harness()
    expect((await h.service.get(userId)).nickname).toBe('裁判甲')
    await expect(h.service.get('33333333-3333-4333-8333-333333333333'))
      .rejects.toMatchObject({ code: 'UNAUTHENTICATED', statusCode: 401 })
  })

  it('局部更新只覆盖提交字段并递增版本，同时写入字段无关的审计投影', async () => {
    const h = harness()
    const updated = await h.service.update(userId, { version: 1, nickname: '  裁判乙 ', legalName: '张三',
      regionCode: '310104', regionLabel: ' 上海市/上海市/徐汇区 ', birthDate: '1990-02-28' })
    expect(updated).toMatchObject({ nickname: '裁判乙', legalName: '张三', regionLabel: '上海市/上海市/徐汇区', version: 2 })
    expect(h.state.saves).toBe(1)
    expect(h.state.audits).toEqual([expect.objectContaining({ actorUserId: userId, action: 'profile.updated' })])
    // 审计快照不得包含实名等个人数据。
    expect(JSON.stringify(h.state.audits)).not.toContain('张三')
  })

  it('版本不一致返回 409 且不写库', async () => {
    const h = harness()
    await expect(h.service.update(userId, { version: 2, nickname: '裁判丙' }))
      .rejects.toMatchObject({ code: 'VERSION_CONFLICT', statusCode: 409 })
    expect(h.state.saves).toBe(0)
    expect(h.state.profile.nickname).toBe('裁判甲')
  })

  it('字段校验失败返回 422，空串按清空处理，无变更不写库不写审计', async () => {
    const h = harness()
    for (const [input, code] of [
      [{ nickname: '   ' }, 'INVALID_NICKNAME'],
      [{ phone: '13800138000' }, 'INVALID_PHONE'],
      [{ regionCode: '310104', regionLabel: null }, 'INVALID_REGION'],
      [{ birthDate: '2030-01-01' }, 'INVALID_BIRTH_DATE'],
    ] as const) {
      await expect(h.service.update(userId, { version: 1, ...input })).rejects.toMatchObject({ code, statusCode: 422 })
    }
    expect(h.state.saves).toBe(0)
    const unchanged = await h.service.update(userId, { version: 1, nickname: '裁判甲', legalName: null })
    expect(unchanged.version).toBe(1)
    expect(h.state.saves).toBe(0)
    expect(h.state.audits).toHaveLength(0)
  })

  it('头像必须是本人已核验的 avatar 上传，清空头像无需额外校验', async () => {
    const h = harness()
    await expect(h.service.update(userId, { version: 1, avatarMediaId: avatarId }))
      .rejects.toMatchObject({ code: 'INVALID_AVATAR', statusCode: 422 })
    h.state.avatars.add(avatarId)
    expect((await h.service.update(userId, { version: 1, avatarMediaId: avatarId })).avatarMediaId).toBe(avatarId)
    expect((await h.service.update(userId, { version: 2, avatarMediaId: null })).avatarMediaId).toBeNull()
  })
})
