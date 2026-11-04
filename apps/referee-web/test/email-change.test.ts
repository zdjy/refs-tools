import { createPinia, disposePinia } from 'pinia'
import { effectScope } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AuthApi } from '../src/api/auth.api'
import { createAuthStore } from '../src/stores/auth'
import { useEmailChange } from '../src/features/account/useEmailChange'

const cleanups: (() => void)[] = []
afterEach(() => { cleanups.splice(0).forEach((cleanup) => cleanup()); vi.restoreAllMocks() })

async function setup(hasPassword = true) {
  const session = { user: { id: 'u-1', email: 'old@example.com', displayName: '裁判', emailVerified: true, hasPassword },
    expiresAt: new Date(Date.now() + 3600_000).toISOString() }
  const api: AuthApi = {
    session: vi.fn().mockResolvedValue(session),
    challenge: vi.fn(async ({ email }: { email: string }) => ({ challengeId: `challenge-${email}`,
      expiresAt: new Date(Date.now() + 300_000).toISOString() })),
    changeEmail: vi.fn(async () => ({ ...session, user: { ...session.user, email: 'new@example.com' } })),
    register: vi.fn(), loginWithCode: vi.fn(), loginWithPassword: vi.fn(), setPassword: vi.fn(), logout: vi.fn(),
  }
  const pinia = createPinia()
  const auth = createAuthStore(api)(pinia)
  await auth.restore()
  const scope = effectScope()
  const state = scope.run(() => useEmailChange(auth, api))!
  cleanups.push(() => { scope.stop(); disposePinia(pinia) })
  return { api, auth, state }
}

describe('更换邮箱交互状态', () => {
  it('新旧验证码与密码齐备后才提交，并携带两个 challenge 证明', async () => {
    const { api, auth, state } = await setup()
    state.fields.oldCode = '123456'
    state.fields.newEmail = 'New@Example.com'
    state.fields.password = 'a-long-password-123'
    await state.sendOld()
    await state.sendNew()
    state.fields.newCode = '654321'
    expect(api.challenge).toHaveBeenNthCalledWith(1, { email: 'old@example.com', purpose: 'email_change' })
    expect(api.challenge).toHaveBeenNthCalledWith(2, { email: 'new@example.com', purpose: 'email_change' })
    expect(await state.submit()).toBe(true)
    expect(api.changeEmail).toHaveBeenCalledWith({
      oldChallengeId: 'challenge-old@example.com', oldCode: '123456',
      newChallengeId: 'challenge-new@example.com', newCode: '654321',
      newEmail: 'new@example.com', password: 'a-long-password-123',
    })
    expect(auth.user?.email).toBe('new@example.com')
    expect(state.success.value).toContain('邮箱已更新')
  })

  it('未发送验证码、邮箱未变或格式错误时逐字段提示且不发请求', async () => {
    const { api, state } = await setup()
    state.fields.oldCode = '123456'
    state.fields.newEmail = 'old@example.com'
    state.fields.newCode = '654321'
    expect(await state.submit()).toBe(false)
    expect(state.errors.value.newEmail).toContain('不能与当前邮箱相同')
    expect(state.errors.value.oldCode).toBeTruthy()
    expect(state.errors.value.newCode).toBeTruthy()
    expect(api.changeEmail).not.toHaveBeenCalled()
  })

  it('无密码账号省略密码步骤，缺少密码不报错', async () => {
    const { api, state } = await setup(false)
    expect(state.requiresPassword.value).toBe(false)
    await state.sendOld()
    state.fields.oldCode = '123456'
    state.fields.newEmail = 'new@example.com'
    await state.sendNew()
    state.fields.newCode = '654321'
    expect(await state.submit()).toBe(true)
    expect(api.changeEmail).toHaveBeenCalledWith(expect.not.objectContaining({ password: expect.anything() }))
  })
})
