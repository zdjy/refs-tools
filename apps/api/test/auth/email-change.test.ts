import { describe, expect, it } from 'vitest'
import { createAuthHarness } from '../helpers/auth.js'

/** 分别向旧、新邮箱签发 email_change 验证码，返回可直接提交的 proof。 */
async function proofs(h: ReturnType<typeof createAuthHarness>, oldEmail: string, newEmail: string) {
  // 发信频控为同一邮箱 60 秒 1 条，测试按真实窗口推进时间而不是放宽策略。
  h.advance(61)
  const old = await h.service.issueChallenge({ email: oldEmail, purpose: 'email_change' }, '127.0.0.1')
  const oldCode = h.mail.at(-1)!.code
  h.advance(61)
  const fresh = await h.service.issueChallenge({ email: newEmail, purpose: 'email_change' }, '127.0.0.1')
  const newCode = h.mail.at(-1)!.code
  return { oldChallengeId: old.challengeId, oldCode, newChallengeId: fresh.challengeId, newCode }
}

describe('更换登录邮箱', () => {
  it('旧码 + 当前密码 + 新码全部通过后切换邮箱并轮换会话', async () => {
    const h = createAuthHarness()
    const original = await h.register('old@example.com', 'a-long-password-123')
    const proof = await proofs(h, 'old@example.com', 'new@example.com')
    const updated = await h.service.changeEmail(original.token, { ...proof, password: 'a-long-password-123', newEmail: 'New@Example.com' })
    expect(updated.user.email).toBe('new@example.com')
    expect(updated.user.emailVerified).toBe(true)
    expect(updated.token).not.toBe(original.token)
    await expect(h.service.requireSession(original.token)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
    expect((await h.service.requireSession(updated.token)).user.email).toBe('new@example.com')
    expect((await h.service.loginWithPassword({ email: 'new@example.com', password: 'a-long-password-123' }, 'ip')).user.id)
      .toBe(updated.user.id)
    await expect(h.service.loginWithPassword({ email: 'old@example.com', password: 'a-long-password-123' }, 'ip'))
      .rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
  })

  it('无密码账号无需密码步骤', async () => {
    const h = createAuthHarness()
    const original = await h.register('old@example.com')
    const proof = await proofs(h, 'old@example.com', 'new@example.com')
    const updated = await h.service.changeEmail(original.token, { ...proof, newEmail: 'new@example.com' })
    expect(updated.user.email).toBe('new@example.com')
  })

  it('密码错误不消费验证码，可改正后重试', async () => {
    const h = createAuthHarness()
    const original = await h.register('old@example.com', 'a-long-password-123')
    const proof = await proofs(h, 'old@example.com', 'new@example.com')
    await expect(h.service.changeEmail(original.token, { ...proof, password: 'wrong-password', newEmail: 'new@example.com' }))
      .rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', statusCode: 401 })
    const updated = await h.service.changeEmail(original.token, { ...proof, password: 'a-long-password-123', newEmail: 'new@example.com' })
    expect(updated.user.email).toBe('new@example.com')
  })

  it('新邮箱已被占用时返回 409 且不改动任何账号', async () => {
    const h = createAuthHarness()
    const original = await h.register('old@example.com')
    await h.register('taken@example.com')
    const proof = await proofs(h, 'old@example.com', 'taken@example.com')
    await expect(h.service.changeEmail(original.token, { ...proof, newEmail: 'taken@example.com' }))
      .rejects.toMatchObject({ code: 'EMAIL_TAKEN', statusCode: 409 })
    expect((await h.service.requireSession(original.token)).user.email).toBe('old@example.com')
  })

  it('新旧邮箱相同、未登录、验证码用途或邮箱不匹配都被拒绝', async () => {
    const h = createAuthHarness()
    const original = await h.register('old@example.com')
    const proof = await proofs(h, 'old@example.com', 'new@example.com')
    await expect(h.service.changeEmail(original.token, { ...proof, newEmail: 'old@example.com' }))
      .rejects.toMatchObject({ code: 'EMAIL_UNCHANGED', statusCode: 422 })
    await expect(h.service.changeEmail(undefined, { ...proof, newEmail: 'new@example.com' }))
      .rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
    // 用 register 用途的验证码充当旧邮箱证明必须失败。
    h.advance(61)
    const register = await h.service.issueChallenge({ email: 'old@example.com', purpose: 'register' }, '127.0.0.1')
    await expect(h.service.changeEmail(original.token, { ...proof, oldChallengeId: register.challengeId,
      oldCode: h.mail.at(-1)!.code, newEmail: 'new@example.com' }))
      .rejects.toMatchObject({ code: 'INVALID_CHALLENGE', statusCode: 400 })
  })
})
