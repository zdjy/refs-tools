import { createPinia, disposePinia } from 'pinia'
import { effectScope, nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AuthApi } from '../src/api/auth.api'
import { AuthApiError, authApi } from '../src/api/auth.api'
import { createAuthStore } from '../src/stores/auth'
import { usePasswordSettings } from '../src/features/account/usePasswordSettings'

const cleanups: (() => void)[] = []
afterEach(() => { cleanups.splice(0).forEach((cleanup) => cleanup()); vi.restoreAllMocks() })

async function setup(hasPassword = false) {
  const session = { user: { id: 'u-1', email: 'ref@example.com', displayName: '裁判', emailVerified: true, hasPassword },
    expiresAt: new Date(Date.now() + 3600_000).toISOString() }
  const api: AuthApi = {
    session: vi.fn().mockResolvedValue(session),
    challenge: vi.fn().mockResolvedValue({ challengeId: '00000000-0000-4000-8000-000000000001',
      expiresAt: new Date(Date.now() + 300_000).toISOString() }),
    setPassword: vi.fn().mockResolvedValue({ ...session, user: { ...session.user, hasPassword: true } }),
    register: vi.fn(), loginWithCode: vi.fn(), loginWithPassword: vi.fn(), changeEmail: vi.fn(), logout: vi.fn(),
  }
  vi.spyOn(authApi, 'challenge').mockImplementation(api.challenge)
  const pinia = createPinia()
  const auth = createAuthStore(api)(pinia)
  await auth.restore()
  const scope = effectScope()
  const state = scope.run(() => usePasswordSettings(auth))!
  cleanups.push(() => { scope.stop(); disposePinia(pinia) })
  state.fields.password = 'a-long-password-123'
  state.fields.confirmation = state.fields.password
  return { api, auth, state }
}

describe('账号密码设置', () => {
  it('已验证邮箱的首次设置直接提交密码，成功后显示注册完成并切换到修改模式', async () => {
    const { api, state } = await setup()
    expect(state.isInitialPassword.value).toBe(true)
    await state.sendCode()
    expect(api.challenge).not.toHaveBeenCalled()
    expect(await state.submit()).toBe(true)
    expect(api.setPassword).toHaveBeenCalledWith({ newPassword: 'a-long-password-123' })
    expect(state.success.value).toContain('注册已完成')
    expect(state.fields.password).toBe('')
    expect(state.fields.confirmation).toBe('')
    expect(state.isInitialPassword.value).toBe(false)
  })

  it('已有密码时仍需完整的邮箱验证码', async () => {
    const { api, state } = await setup(true)
    expect(await state.submit()).toBe(false)
    expect(state.errors.value.code).toBeTruthy()
    expect(api.setPassword).not.toHaveBeenCalled()
    await state.sendCode()
    state.fields.code = '123456'
    expect(await state.submit()).toBe(true)
    expect(api.challenge).toHaveBeenCalledWith({ email: 'ref@example.com', purpose: 'password' })
    expect(api.setPassword).toHaveBeenCalledWith({ newPassword: 'a-long-password-123', code: '123456',
      challengeId: '00000000-0000-4000-8000-000000000001' })
    expect(state.success.value).toContain('密码已更新')
  })

  it('首次设置仍校验确认密码，失败保留输入且不显示成功', async () => {
    const { api, state } = await setup()
    state.fields.confirmation = 'different'
    expect(await state.submit()).toBe(false)
    expect(state.errors.value.confirmation).toBeTruthy()
    expect(state.errors.value.code).toBeUndefined()
    expect(api.setPassword).not.toHaveBeenCalled()
    state.fields.confirmation = state.fields.password
    vi.mocked(api.setPassword).mockRejectedValueOnce(new AuthApiError('NETWORK_ERROR', 0))
    expect(await state.submit()).toBe(false)
    expect(state.fields.password).toBe('a-long-password-123')
    expect(state.success.value).toBe('')
    expect(state.isInitialPassword.value).toBe(true)
  })

  it('分步导航：有密码时先验证邮箱再设置新密码，上一步保留输入', async () => {
    const { api, state } = await setup(true)
    expect(state.steps.value.map((item) => item.id)).toEqual(['code', 'password'])
    expect(state.step.value.id).toBe('code')
    expect(state.next()).toBe(false)
    expect(state.step.value.id).toBe('code')
    await state.sendCode()
    state.fields.code = '123456'
    expect(state.next()).toBe(true)
    expect(state.step.value.id).toBe('password')
    expect(state.isLast.value).toBe(true)
    // 最后一步的 next() 只校验当前步，不提交；提交由 submit() 负责。
    state.fields.password = ''
    state.fields.confirmation = ''
    expect(state.next()).toBe(false)
    expect(state.errors.value.password).toBeTruthy()
    expect(api.setPassword).not.toHaveBeenCalled()
    state.fields.password = 'a-long-password-123'
    state.fields.confirmation = state.fields.password
    state.back()
    expect(state.step.value.id).toBe('code')
    expect(state.fields.code).toBe('123456')
    expect(state.errors.value).toEqual({})
  })

  it('首次设置只有一个步骤，直接显示最终按钮而不是空步骤', async () => {
    const { state } = await setup()
    expect(state.steps.value.map((item) => item.id)).toEqual(['password'])
    expect(state.isFirst.value).toBe(true)
    expect(state.isLast.value).toBe(true)
    expect(await state.submit()).toBe(true)
  })

  it('最终提交一次报出所有缺失项，而不是只报当前步骤', async () => {
    const { api, state } = await setup(true)
    state.fields.password = ''
    state.fields.confirmation = 'mismatch'
    expect(await state.submit()).toBe(false)
    expect(state.errors.value.code).toBeTruthy()
    expect(state.errors.value.password).toBeTruthy()
    expect(state.errors.value.confirmation).toBeTruthy()
    expect(api.setPassword).not.toHaveBeenCalled()
  })

  it('未验证邮箱时不能进入免验证码设置模式，退出后清除密码', async () => {
    const { auth, state } = await setup()
    auth.session!.user.emailVerified = false
    expect(state.isInitialPassword.value).toBe(false)
    expect(await state.submit()).toBe(false)
    await auth.logout()
    await nextTick()
    expect(state.fields.password).toBe('')
    expect(state.fields.confirmation).toBe('')
  })
})
