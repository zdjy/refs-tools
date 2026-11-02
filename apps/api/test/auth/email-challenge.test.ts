import { describe, expect, it } from 'vitest'
import { createAuthHarness } from '../helpers/auth.js'

describe('邮箱 challenge', () => {
  it('返回短时 challenge，验证码只送达邮箱，不在响应中公开', async () => {
    const h = createAuthHarness()
    const result = await h.service.issueChallenge({ email: 'Ref@example.com', purpose: 'register' }, '127.0.0.1')
    expect(result).toEqual({ challengeId: expect.any(String), expiresAt: '2026-11-02T00:05:00.000Z' })
    expect(h.mail[0]).toMatchObject({ email: 'ref@example.com', code: expect.stringMatching(/^\d{6}$/) })
  })

  it('验证码错误达到上限后，正确验证码也不能使用', async () => {
    const h = createAuthHarness()
    const c = await h.service.issueChallenge({ email: 'ref@example.com', purpose: 'register' }, 'ip')
    const proof = { challengeId: c.challengeId, displayName: '裁判' }
    const actual = h.mail[0]!.code
    const wrong = actual === '000000' ? '111111' : '000000'
    for (let n = 0; n < 5; n++) {
      await expect(h.service.register({ ...proof, code: wrong })).rejects.toMatchObject({ code: 'INVALID_CHALLENGE' })
    }
    await expect(h.service.register({ ...proof, code: actual })).rejects.toMatchObject({ code: 'INVALID_CHALLENGE' })
  })

  it('过期、重放与跨用途消费统一拒绝', async () => {
    const h = createAuthHarness()
    const c = await h.service.issueChallenge({ email: 'ref@example.com', purpose: 'register' }, 'ip')
    const code = h.mail[0]!.code
    await expect(h.service.loginWithCode({ ...c, code, email: 'ref@example.com' }, 'ip'))
      .rejects.toMatchObject({ code: 'INVALID_CHALLENGE' })
    const registered = await h.service.register({ ...c, code, displayName: '裁判' })
    expect(registered.user.emailVerified).toBe(true)
    await expect(h.service.register({ ...c, code, displayName: '裁判' })).rejects.toMatchObject({ code: 'INVALID_CHALLENGE' })
    h.advance(60)
    const expired = await h.service.issueChallenge({ email: 'other@example.com', purpose: 'register' }, 'ip')
    h.advance(300)
    await expect(h.service.register({ ...expired, code: h.mail.at(-1)!.code, displayName: '裁判' }))
      .rejects.toMatchObject({ code: 'INVALID_CHALLENGE' })
  })

  it('发送按规范化邮箱和 IP 频控，时间窗结束可以重试', async () => {
    const h = createAuthHarness()
    await h.service.issueChallenge({ email: 'REF@example.com', purpose: 'register' }, 'ip')
    await expect(h.service.issueChallenge({ email: 'ref@example.com', purpose: 'login' }, 'other-ip'))
      .rejects.toMatchObject({ code: 'RATE_LIMITED', statusCode: 429 })
    for (let n = 0; n < 9; n++) await h.service.issueChallenge({ email: `ref${n}@example.com`, purpose: 'login' }, 'ip')
    await expect(h.service.issueChallenge({ email: 'new@example.com', purpose: 'login' }, 'ip'))
      .rejects.toMatchObject({ code: 'RATE_LIMITED' })
    h.advance(60)
    await expect(h.service.issueChallenge({ email: 'ref@example.com', purpose: 'register' }, 'ip')).resolves.toHaveProperty('challengeId')
  })

  it('验证码验证成功但后续业务失败时也会一次性失效', async () => {
    const h = createAuthHarness()
    const c = await h.service.issueChallenge({ email: 'ref@example.com', purpose: 'register' }, 'ip')
    const code = h.mail[0]!.code
    await expect(h.service.register({ ...c, code, displayName: '裁判', password: 'short' }))
      .rejects.toMatchObject({ code: 'WEAK_PASSWORD' })
    await expect(h.service.register({ ...c, code, displayName: '裁判' }))
      .rejects.toMatchObject({ code: 'INVALID_CHALLENGE' })
  })

  it('投递失败返回通用错误，不暴露 provider 内容', async () => {
    const h = createAuthHarness()
    h.failMail()
    await expect(h.service.issueChallenge({ email: 'ref@example.com', purpose: 'register' }, 'ip'))
      .rejects.toMatchObject({ code: 'EMAIL_UNAVAILABLE', message: '邮件暂时无法发送，请稍后重试' })
  })
})
