import { describe, expect, it, vi } from 'vitest'
import { createAuthHarness } from '../helpers/auth.js'

describe('首次设置密码', () => {
  it('邮箱验证码注册后无需再次验证，设置后可用密码登录且会话已轮换', async () => {
    const h = createAuthHarness()
    const original = await h.register()
    expect(original.user.hasPassword).toBe(false)
    expect((await h.service.requireSession(original.token)).user.hasPassword).toBe(false)
    const updated = await h.service.setPassword(original.token, { newPassword: 'a-long-password-123' })
    expect(updated.user.hasPassword).toBe(true)
    expect(h.mail).toHaveLength(1)
    await expect(h.service.requireSession(original.token)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
    expect((await h.service.requireSession(updated.token)).user.hasPassword).toBe(true)
    expect((await h.service.loginWithPassword({ email: original.user.email, password: 'a-long-password-123' }, 'ip')).user.id)
      .toBe(original.user.id)
    await expect(h.service.setPassword(updated.token, { newPassword: 'another-password-123' }))
      .rejects.toMatchObject({ code: 'PASSWORD_VERIFICATION_REQUIRED', statusCode: 403 })
  })

  it('弱密码失败后保留首次设置资格', async () => {
    const h = createAuthHarness()
    const original = await h.register()
    await expect(h.service.setPassword(original.token, { newPassword: 'short' }))
      .rejects.toMatchObject({ code: 'WEAK_PASSWORD' })
    expect((await h.service.requireSession(original.token)).user.hasPassword).toBe(false)
    await expect(h.service.setPassword(original.token, { newPassword: 'a-long-password-123' }))
      .resolves.toHaveProperty('user.hasPassword', true)
  })

  it('匿名、已注销或过期会话不能首次设置密码', async () => {
    const h = createAuthHarness()
    const original = await h.register()
    await expect(h.service.setPassword(undefined, { newPassword: 'a-long-password-123' }))
      .rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
    await h.service.logout(original.token)
    await expect(h.service.setPassword(original.token, { newPassword: 'a-long-password-123' }))
      .rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
    h.advance(60)
    const another = await h.register('other@example.com')
    h.advance(604800)
    await expect(h.service.setPassword(another.token, { newPassword: 'a-long-password-123' }))
      .rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
  })

  it('事务锁定后再次检查邮箱验证、密码和当前会话，防止使用过期快照', async () => {
    for (const change of ['password', 'email', 'logout', 'disabled'] as const) {
      const h = createAuthHarness()
      const original = await h.register()
      const lock = h.repository.lockAccount.bind(h.repository)
      vi.spyOn(h.repository, 'lockAccount').mockImplementationOnce(async (id) => {
        const account = (await lock(id))!
        if (change === 'password') account.passwordHash = 'already-set'
        if (change === 'email') account.emailVerified = false
        if (change === 'disabled') account.status = 'disabled'
        if (change === 'logout') await h.repository.revokeUserSessions(id, new Date())
        return account
      })
      await expect(h.service.setPassword(original.token, { newPassword: 'a-long-password-123' }))
        .rejects.toMatchObject({ code: change === 'password' ? 'PASSWORD_VERIFICATION_REQUIRED'
          : change === 'email' ? 'EMAIL_NOT_VERIFIED' : 'UNAUTHENTICATED' })
    }
  })
})
