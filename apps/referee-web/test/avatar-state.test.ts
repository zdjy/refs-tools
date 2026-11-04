import { describe, expect, it, vi } from 'vitest'
import { ProfileApiError, type ProfileApi } from '../src/api/profile.api'
import { createAvatarState } from '../src/stores/avatar'

const mediaA = '11111111-1111-4111-8111-111111111111'
const mediaB = '22222222-2222-4222-8222-222222222222'

function harness() {
  const avatarUrl = vi.fn(async (id: string) => ({ url: `https://oss.example/${id}`, expiresAt: '2030-01-01T00:00:00.000Z' }))
  return { avatarUrl, state: createAvatarState({ avatarUrl } as Pick<ProfileApi, 'avatarUrl'>) }
}

describe('顶栏头像状态', () => {
  it('无头像时不请求签名，直接回落空 URL', async () => {
    const h = harness()
    await h.state.ensure(null)
    expect(h.avatarUrl).not.toHaveBeenCalled()
    expect(h.state.url.value).toBe('')
    expect(h.state.loading.value).toBe(false)
  })

  it('同一媒体 ID 只签名一次，切换头像后取新 URL', async () => {
    const h = harness()
    await h.state.ensure(mediaA)
    expect(h.state.url.value).toBe(`https://oss.example/${mediaA}`)
    await h.state.ensure(mediaA)
    expect(h.avatarUrl).toHaveBeenCalledTimes(1)
    await h.state.ensure(mediaB)
    expect(h.state.url.value).toBe(`https://oss.example/${mediaB}`)
    expect(h.avatarUrl).toHaveBeenCalledTimes(2)
  })

  it('签名失败按无头像降级，不抛错也不保留过期值', async () => {
    const h = harness()
    await h.state.ensure(mediaA)
    h.avatarUrl.mockRejectedValueOnce(new ProfileApiError('NOT_FOUND', 404))
    h.state.invalidate()
    await h.state.ensure(mediaB)
    expect(h.state.url.value).toBe('')
    expect(h.state.loading.value).toBe(false)
  })

  it('invalidate 丢弃缓存，使下次 ensure 重新签名', async () => {
    const h = harness()
    await h.state.ensure(mediaA)
    expect(h.avatarUrl).toHaveBeenCalledTimes(1)
    h.state.invalidate()
    expect(h.state.url.value).toBe('')
    await h.state.ensure(mediaA)
    expect(h.avatarUrl).toHaveBeenCalledTimes(2)
  })

  it('迟到的旧响应不覆盖新账号的头像', async () => {
    const h = harness()
    let releaseSlow: (value: { url: string; expiresAt: string }) => void = () => {}
    h.avatarUrl.mockImplementationOnce(() => new Promise((resolve) => { releaseSlow = resolve }))
    const slow = h.state.ensure(mediaA)
    await h.state.ensure(mediaB)
    releaseSlow({ url: 'https://oss.example/stale', expiresAt: '2030-01-01T00:00:00.000Z' })
    await slow
    expect(h.state.url.value).toBe(`https://oss.example/${mediaB}`)
  })
})
