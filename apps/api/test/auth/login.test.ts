import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { createAuthHarness } from '../helpers/auth.js'
import { hashPassword } from '../../src/modules/auth/auth.security.js'

describe('登录与可撤销会话', () => {
  it('注册后可恢复会话、密码登录，注销后不能再恢复', async () => {
    const h = createAuthHarness()
    const grant = await h.register('ref@example.com', 'a-long-password-123')
    expect((await h.service.requireSession(grant.token)).user).toEqual(grant.user)
    const loggedIn = await h.service.loginWithPassword({ email: 'REF@example.com', password: 'a-long-password-123' }, 'ip')
    expect(loggedIn.user).toEqual(grant.user)
    expect(loggedIn.token).not.toBe(grant.token)
    await h.service.logout(grant.token)
    await expect(h.service.requireSession(grant.token)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
    await expect(h.service.requireSession(loggedIn.token)).resolves.toHaveProperty('user.id', grant.user.id)
    h.advance(604800)
    await expect(h.service.requireSession(loggedIn.token)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
  })

  it('验证码登录须匹配邮箱，验证后可用一次', async () => {
    const h = createAuthHarness()
    const registered = await h.register()
    h.advance(60)
    const c = await h.service.issueChallenge({ email: 'ref@example.com', purpose: 'login' }, 'ip')
    const code = h.mail.at(-1)!.code
    await expect(h.service.loginWithCode({ ...c, code, email: 'other@example.com' }, 'ip')).rejects.toMatchObject({ code: 'INVALID_CHALLENGE' })
    const login = await h.service.loginWithCode({ ...c, code, email: 'ref@example.com' }, 'ip')
    expect(login.user.id).toBe(registered.user.id)
    await expect(h.service.loginWithCode({ ...c, code, email: 'ref@example.com' }, 'ip')).rejects.toMatchObject({ code: 'INVALID_CHALLENGE' })
  })

  it('未知账号、未设密码与密码错误都返回统一失败', async () => {
    const h = createAuthHarness()
    await h.register()
    for (const email of ['unknown@example.com', 'ref@example.com']) {
      await expect(h.service.loginWithPassword({ email, password: 'wrong-password' }, 'ip'))
        .rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', statusCode: 401 })
    }
  })

  it('未验证邮箱可恢复基础会话，但被核心业务门禁拒绝', async () => {
    const h = createAuthHarness()
    const id = randomUUID()
    await h.repository.createAccount({ id, email: 'unverified@example.com', displayName: '裁判',
      status: 'active', emailVerified: false, passwordHash: await hashPassword('a-long-password-123'),
      avatarMediaId: null })
    const grant = await h.service.loginWithPassword({ email: 'unverified@example.com', password: 'a-long-password-123' }, 'ip')
    expect((await h.service.requireSession(grant.token)).user.emailVerified).toBe(false)
    await expect(h.service.requireVerifiedSession(grant.token)).rejects.toMatchObject({ code: 'EMAIL_NOT_VERIFIED', statusCode: 403 })
  })

  it('密码修改要求自身邮箱重验，成功后撤销所有旧会话', async () => {
    const h = createAuthHarness()
    const original = await h.register('ref@example.com', 'a-long-password-123')
    h.advance(60)
    const c = await h.service.issueChallenge({ email: 'ref@example.com', purpose: 'password' }, 'ip')
    const updated = await h.service.setPassword(original.token, { ...c, code: h.mail.at(-1)!.code, newPassword: 'another-password-123' })
    await expect(h.service.requireSession(original.token)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
    await expect(h.service.requireSession(updated.token)).resolves.toHaveProperty('user.id', original.user.id)
    await expect(h.service.loginWithPassword({ email: 'ref@example.com', password: 'a-long-password-123' }, 'ip'))
      .rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
    expect((await h.service.loginWithPassword({ email: 'ref@example.com', password: 'another-password-123' }, 'ip')).user.id)
      .toBe(original.user.id)
  })

  it('密码尝试超过邮箱限额时拒绝继续执行', async () => {
    const h = createAuthHarness()
    for (let n = 0; n < 10; n++) {
      await expect(h.service.loginWithPassword({ email: 'absent@example.com', password: 'wrong' }, 'ip'))
        .rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
    }
    await expect(h.service.loginWithPassword({ email: 'absent@example.com', password: 'wrong' }, 'other-ip'))
      .rejects.toMatchObject({ code: 'RATE_LIMITED' })
  })

  it('验证码登录同样受 IP 与邮箱双重频控保护', async () => {
    const h = createAuthHarness()
    const registered = await h.register()
    h.advance(60)
    for (let n = 0; n < 10; n++) {
      const challenge = await h.service.issueChallenge({ email: 'ref@example.com', purpose: 'login' }, `ip-${n}`)
      const actual = h.mail.at(-1)!.code
      const wrong = actual === '000000' ? '111111' : '000000'
      await expect(h.service.loginWithCode({ ...challenge, code: wrong, email: 'ref@example.com' }, `login-ip-${n}`))
        .rejects.toMatchObject({ code: 'INVALID_CHALLENGE' })
      h.advance(60)
    }
    const challenge = await h.service.issueChallenge({ email: registered.user.email, purpose: 'login' }, 'new-ip')
    const actual = h.mail.at(-1)!.code
    const wrong = actual === '000000' ? '111111' : '000000'
    await expect(h.service.loginWithCode({ ...challenge, code: wrong, email: registered.user.email }, 'new-login-ip'))
      .rejects.toMatchObject({ code: 'RATE_LIMITED' })
  })
})
