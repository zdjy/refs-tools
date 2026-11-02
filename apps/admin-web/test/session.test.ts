import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AuthSessionResponse } from '@refs-tools/contracts/auth'
import { createSessionState } from '../src/application/session-state'
import { ApiError } from '../src/api/http'

const value: AuthSessionResponse['data'] = {
  user: { id: '11111111-1111-4111-8111-111111111111', email: 'admin@example.com', displayName: '管理员', emailVerified: true, hasPassword: true },
  expiresAt: '2099-01-01T00:00:00Z',
}
const states: ReturnType<typeof createSessionState>[] = []
afterEach(() => { states.forEach(state => state.dispose()); states.length = 0; vi.useRealTimers() })
function setup() {
  const api = { session: vi.fn().mockResolvedValue(value), login: vi.fn().mockResolvedValue(value), logout: vi.fn().mockResolvedValue(undefined) }
  const state = createSessionState(api)
  states.push(state)
  return { api, state }
}

describe('管理端内存会话', () => {
  it('恢复会话；401 与连接失败分开处理', async () => {
    const { api, state } = setup()
    await state.restore()
    expect(state.user.value?.email).toBe(value.user.email)
    api.session.mockRejectedValueOnce(new ApiError(401, 'UNAUTHENTICATED'))
    await state.restore()
    expect(state.status.value).toBe('anonymous')
    api.session.mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR'))
    await state.restore()
    expect(state.status.value).toBe('error')
    expect(state.error.value).toContain('连接失败')
  })

  it('登录失败不接受会话；成功后只使用契约投影', async () => {
    const { api, state } = setup()
    api.login.mockRejectedValueOnce(new ApiError(400, 'INVALID_CREDENTIALS'))
    expect(await state.login({ email: 'x@example.com', password: 'wrong' })).toBe(false)
    expect(state.session.value).toBeNull()
    expect(await state.login({ email: value.user.email, password: 'password' })).toBe(true)
    expect(state.session.value).toEqual(value)
  })

  it('退出失败不冒充已退出，成功后清空会话', async () => {
    const { api, state } = setup()
    await state.restore()
    api.logout.mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR'))
    await state.logout()
    expect(state.status.value).toBe('authenticated')
    expect(state.error.value).toContain('退出未完成')
    await state.logout()
    expect(state.session.value).toBeNull()
    expect(state.status.value).toBe('anonymous')
  })

  it('失效后的迟到响应不恢复旧身份', async () => {
    const { api, state } = setup()
    let resolve!: (data: typeof value) => void
    api.session.mockImplementationOnce(() => new Promise(done => { resolve = done }))
    const work = state.restore()
    state.invalidate()
    resolve(value)
    await work
    expect(state.session.value).toBeNull()
  })

  it('到期销毁身份并阻止重复登录提交', async () => {
    vi.useFakeTimers()
    const { api, state } = setup()
    api.session.mockResolvedValueOnce({ ...value, expiresAt: new Date(Date.now() + 1000).toISOString() })
    await state.restore()
    await vi.advanceTimersByTimeAsync(1000)
    expect(state.status.value).toBe('anonymous')
    let done!: (data: typeof value) => void
    api.login.mockImplementationOnce(() => new Promise(resolve => { done = resolve }))
    const work = state.login({ email: value.user.email, password: 'pass' })
    expect(await state.login({ email: value.user.email, password: 'pass' })).toBe(false)
    expect(api.login).toHaveBeenCalledTimes(1)
    done(value); await work
  })
})
