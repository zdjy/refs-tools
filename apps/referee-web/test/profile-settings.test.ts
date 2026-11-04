import { describe, expect, it, vi } from 'vitest'
import type { Profile } from '@refs-tools/contracts/profile'
import { ProfileApiError, type ProfileApi } from '../src/api/profile.api'
import type { MediaApi } from '../src/api/media.api'
import { useProfileSettings } from '../src/views/profile/useProfileSettings'

const profile: Profile = {
  userId: '11111111-1111-4111-8111-111111111111', nickname: '裁判甲', legalName: null, phone: null,
  regionCode: null, regionLabel: null, addressDetail: null, birthDate: null, avatarMediaId: null, version: 3,
}

function harness(overrides: Partial<ProfileApi> = {}) {
  const api: ProfileApi = {
    read: vi.fn(async () => ({ ...profile })),
    update: vi.fn(async (body) => ({ ...profile, ...body, version: body.version + 1 })),
    avatarUrl: vi.fn(async () => ({ url: 'https://oss.example/avatar', expiresAt: '2030-01-01T00:00:00.000Z' })),
    ...overrides,
  }
  const media = { create: vi.fn(), renew: vi.fn(), complete: vi.fn(), put: vi.fn() } as unknown as MediaApi
  return { api, media, state: useProfileSettings(api, media) }
}

describe('账号设置档案状态', () => {
  it('读取后填入表单，并为已选头像申请一次性展示 URL', async () => {
    const h = harness({ read: vi.fn(async () => ({ ...profile, avatarMediaId: '22222222-2222-4222-8222-222222222222' })) })
    await h.state.load()
    expect(h.state.fields.nickname).toBe('裁判甲')
    expect(h.state.fields.legalName).toBe('')
    expect(h.state.avatarUrl.value).toBe('https://oss.example/avatar')
    expect(h.state.loading.value).toBe(false)
  })

  it('读取失败只提示重试，不暗示有已填写内容', async () => {
    const h = harness({ read: vi.fn(async () => { throw new ProfileApiError('INTERNAL_ERROR', 500) }) })
    await h.state.load()
    expect(h.state.loadError.value).toContain('请稍后重试')
    expect(h.state.loadError.value).not.toContain('已填写')
    expect(h.state.loading.value).toBe(false)
  })

  it('只提交改动字段并带上版本号，成功后刷新本地状态', async () => {
    const h = harness()
    await h.state.load()
    h.state.fields.nickname = ' 裁判乙 '
    h.state.fields.phone = '+8613800138000'
    expect(await h.state.save()).toBe(true)
    expect(h.api.update).toHaveBeenCalledWith({ version: 3, nickname: '裁判乙', phone: '+8613800138000' })
    expect(h.state.profile.value?.version).toBe(4)
    expect(h.state.saved.value).toContain('已保存')
  })

  it('没有修改时不发请求', async () => {
    const h = harness()
    await h.state.load()
    expect(await h.state.save()).toBe(true)
    expect(h.api.update).not.toHaveBeenCalled()
    expect(h.state.saved.value).toContain('没有需要保存')
  })

  it('版本冲突提示刷新并重新读取服务端档案', async () => {
    const conflict = vi.fn(async () => { throw new ProfileApiError('VERSION_CONFLICT', 409) })
    const h = harness({ update: conflict as unknown as ProfileApi['update'] })
    await h.state.load()
    h.state.fields.nickname = '裁判乙'
    expect(await h.state.save()).toBe(false)
    expect(h.state.saveError.value).toContain('刷新')
    expect(h.api.read).toHaveBeenCalledTimes(2)
    expect(h.state.fields.nickname).toBe('裁判乙')
    expect(h.state.saved.value).toBe('')
  })

  it('字段错误落到对应输入，清空头像提交 null', async () => {
    const h = harness()
    await h.state.load()
    h.state.fields.phone = '13800138000'
    expect(await h.state.save()).toBe(false)
    expect(h.state.fieldError.value?.field).toBe('phone')
    expect(h.api.update).not.toHaveBeenCalled()

    h.state.fields.phone = ''
    await h.state.save()
    await h.state.removeAvatar()
    expect(h.api.update).toHaveBeenLastCalledWith({ version: 3, avatarMediaId: null })
  })
})
