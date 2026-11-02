import { effectScope } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAuthState } from '../src/application/auth-state'
import { AuthApiError, type AuthApi } from '../src/api/auth.api'
import { identityPresentation } from '../src/navigation/identity.presentation'

const scopes: ReturnType<typeof effectScope>[] = []
afterEach(() => scopes.splice(0).forEach((scope) => scope.stop()))
function setup(session: AuthApi['session']) {
  const api = { session } as AuthApi
  const scope = effectScope()
  scopes.push(scope)
  return scope.run(() => createAuthState(api))!
}

describe('共享导航身份投影', () => {
  it('未知和加载时不先闪现登录入口，恢复请求复用且不会每次导航刷新', async () => {
    let finish!: () => void
    const session = vi.fn(() => new Promise<Awaited<ReturnType<AuthApi['session']>>>((_resolve, reject) => {
      finish = () => reject(new AuthApiError('UNAUTHENTICATED', 401))
    }))
    const state = setup(session)
    expect(identityPresentation(state.status.value).kind).toBe('pending')
    const restoring = state.restore()
    void state.restore()
    expect(state.status.value).toBe('loading')
    expect(identityPresentation(state.status.value).text).toBe('正在确认登录状态…')
    finish()
    await restoring
    await state.restore()
    expect(session).toHaveBeenCalledOnce()
    expect(identityPresentation(state.status.value).kind).toBe('anonymous')
  })

  it('401 表示匿名，网络错误仍显示错误且可显式重试', async () => {
    const session = vi.fn().mockRejectedValueOnce(new Error('network'))
      .mockRejectedValueOnce(new AuthApiError('UNAUTHENTICATED', 401))
    const state = setup(session)
    await state.restore()
    expect(identityPresentation(state.status.value)).toEqual({ kind: 'error', text: '暂时无法确认登录状态' })
    await state.restore()
    expect(session).toHaveBeenCalledOnce()
    await state.restore(true)
    expect(session).toHaveBeenCalledTimes(2)
    expect(identityPresentation(state.status.value).kind).toBe('anonymous')
  })

  it('成功只投影显示名称，不输出完整邮箱或其他私密字段', async () => {
    const state = setup(vi.fn().mockResolvedValue({ user: { id: 'synthetic', displayName: '合成裁判'.repeat(15), email: 'synthetic@example.test', emailVerified: true, hasPassword: false }, expiresAt: '2099-01-01T00:00:00Z' }))
    await state.restore()
    expect(identityPresentation(state.status.value, state.user.value?.displayName)).toEqual({ kind: 'account', text: '合成裁判'.repeat(15) })
    expect(JSON.stringify(identityPresentation(state.status.value, state.user.value?.displayName))).not.toContain('@')
  })
})
