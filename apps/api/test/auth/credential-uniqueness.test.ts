import { describe, expect, it } from 'vitest'
import { createAuthHarness } from '../helpers/auth.js'

describe('凭据归属', () => {
  it('重复邮箱注册不覆盖用户、显示名称或密码', async () => {
    const h = createAuthHarness()
    const first = await h.register('ref@example.com', 'original-password-123')
    h.advance(60)
    const c = await h.service.issueChallenge({ email: 'REF@example.com', purpose: 'register' }, 'ip')
    await expect(h.service.register({ ...c, code: h.mail.at(-1)!.code, displayName: '其他人', password: 'replacement-password' }))
      .rejects.toMatchObject({ code: 'INVALID_CHALLENGE' })
    const login = await h.service.loginWithPassword({ email: 'ref@example.com', password: 'original-password-123' }, 'ip')
    expect(login.user).toEqual(first.user)
  })

  it('不能使用另一邮箱的 challenge 设置当前用户密码', async () => {
    const h = createAuthHarness()
    const first = await h.register()
    const c = await h.service.issueChallenge({ email: 'other@example.com', purpose: 'password' }, 'other-ip')
    await expect(h.service.setPassword(first.token, { ...c, code: h.mail.at(-1)!.code, newPassword: 'new-password-123' }))
      .rejects.toMatchObject({ code: 'INVALID_CHALLENGE' })
    await expect(h.service.loginWithPassword({ email: 'ref@example.com', password: 'new-password-123' }, 'ip'))
      .rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
  })
})
