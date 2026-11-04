import { describe, expect, it, vi } from 'vitest'
import { AuthApiError, authErrorMessage, createAuthApi } from '../src/api/auth.api'
import { HttpError } from '../src/api/http/errors'
import { MediaApiError, createMediaApi } from '../src/api/media.api'
import type { PlatformClient } from '../src/api/http/platform-client'

const platform = (): PlatformClient => ({ get: vi.fn(), post: vi.fn() })
const intent = (url = 'https://oss.example/o') => ({
  mediaId: 'm1',
  upload: { method: 'PUT', url, headers: { 'Content-Type': 'text/plain' }, expiresAt: '2030-01-01T00:00:00.000Z' },
}) as never
const file = new File(['x'], 'a.txt', { type: 'text/plain' })

describe('认证网关错误翻译', () => {
  it.each([
    [new HttpError('network', null, 0), 'NETWORK_ERROR', 0],
    [new HttpError('http', 'INVALID_CREDENTIALS', 401), 'INVALID_CREDENTIALS', 401],
    [new HttpError('http', null, 502), 'SERVICE_UNAVAILABLE', 502],
    [new HttpError('invalid-response', null, 200), 'SERVICE_UNAVAILABLE', 200],
    [new Error('boom'), 'SERVICE_UNAVAILABLE', 0],
  ])('%s -> %s', async (cause, code, status) => {
    const client = platform()
    vi.mocked(client.post).mockRejectedValue(cause)
    const error = await createAuthApi(client).loginWithPassword({ email: 'a@b.c', password: 'p' }).catch((e) => e)
    expect(error).toBeInstanceOf(AuthApiError)
    expect(error).toMatchObject({ code, status })
    expect(authErrorMessage(error)).not.toContain('boom')
  })

  it('路径与方法与服务端约定一致', async () => {
    const client = platform()
    vi.mocked(client.get).mockResolvedValue({})
    vi.mocked(client.post).mockResolvedValue({})
    const api = createAuthApi(client)
    await api.session()
    await api.logout()
    await api.setPassword({ newPassword: 'x' } as never)
    expect(client.get).toHaveBeenCalledWith('/auth/session')
    expect(client.post).toHaveBeenCalledWith('/auth/logout', {})
    expect(client.post).toHaveBeenCalledWith('/auth/password', { newPassword: 'x' })
  })
})

describe('媒体网关', () => {
  const setup = (put = vi.fn()) => {
    const client = platform()
    return { client, put, api: createMediaApi(client, { put }) }
  }

  it('创建意图携带幂等键，续期与完成对 ID 编码', async () => {
    const { client, api } = setup()
    vi.mocked(client.post).mockResolvedValue({})
    await api.create({ fileName: 'a' } as never, 'key-1')
    await api.renew('a/b')
    await api.complete('a/b')
    expect(client.post).toHaveBeenNthCalledWith(1, '/media/upload-intents', { fileName: 'a' }, { 'Idempotency-Key': 'key-1' })
    expect(client.post).toHaveBeenNthCalledWith(2, '/media/a%2Fb/upload-authorization')
    expect(client.post).toHaveBeenNthCalledWith(3, '/media/a%2Fb/complete', {})
  })

  it('平台错误翻译为 MediaApiError', async () => {
    const { client, api } = setup()
    vi.mocked(client.post).mockRejectedValueOnce(new HttpError('network', null, 0))
    await expect(api.renew('m1')).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 })
    vi.mocked(client.post).mockRejectedValueOnce(new HttpError('http', 'OBJECT_NOT_FOUND', 409))
    await expect(api.complete('m1')).rejects.toMatchObject({ code: 'OBJECT_NOT_FOUND', status: 409 })
    vi.mocked(client.post).mockRejectedValueOnce(new HttpError('http', null, 500))
    await expect(api.complete('m1')).rejects.toMatchObject({ code: 'MEDIA_SERVICE_UNAVAILABLE' })
  })

  it('仅允许 HTTPS 上传地址，且不触达存储', async () => {
    const { api, put } = setup()
    await expect(api.put(file, intent('http://oss.example/o'), new AbortController().signal))
      .rejects.toMatchObject({ code: 'INVALID_UPLOAD_URL' })
    expect(put).not.toHaveBeenCalled()
  })

  it.each([[200, null], [204, null], [409, null], [403, 'UPLOAD_FAILED'], [500, 'UPLOAD_FAILED']])(
    '存储返回 %s', async (status, code) => {
      const { api } = setup(vi.fn().mockResolvedValue({ status }))
      const result = api.put(file, intent(), new AbortController().signal)
      if (code) await expect(result).rejects.toMatchObject({ code, status })
      else await expect(result).resolves.toBeUndefined()
    },
  )

  it('存储传输失败为 UPLOAD_INTERRUPTED', async () => {
    const { api } = setup(vi.fn().mockRejectedValue(new HttpError('network', null, 0)))
    const error = await api.put(file, intent(), new AbortController().signal).catch((e) => e)
    expect(error).toBeInstanceOf(MediaApiError)
    expect(error).toMatchObject({ code: 'UPLOAD_INTERRUPTED', status: 0 })
  })
})
