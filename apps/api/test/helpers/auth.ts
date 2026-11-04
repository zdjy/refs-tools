import type { AuthAccount, AuthRepository, ChallengeMail, EmailChallenge, StoredSession } from '../../src/modules/auth/auth.types.js'
import { AuthService } from '../../src/modules/auth/auth.service.js'
import { defaultAuthPolicy } from '../../src/modules/auth/auth.config.js'

/** 内存替身仅替代数据库端口；测试通过 Service 观察用例结果。 */
export function createAuthHarness() {
  const accounts = new Map<string, AuthAccount>()
  const challenges = new Map<string, EmailChallenge>()
  const sessions = new Map<string, StoredSession & { revoked: boolean }>()
  const rates = new Map<string, { count: number; expiresAt: number }>()
  const mail: ChallengeMail[] = []
  let time = new Date('2026-11-02T00:00:00.000Z')
  let mailFailure = false
  const repository: AuthRepository = {
    async takeRateLimit(key, now, seconds, limit) {
      let rate = rates.get(key)
      if (!rate || rate.expiresAt <= now.getTime()) {
        rate = { count: 0, expiresAt: now.getTime() + seconds * 1000 }
        rates.set(key, rate)
      }
      if (rate.count >= limit) return false
      rate.count++
      return true
    },
    async saveChallenge(c) { challenges.set(c.id, { ...c }) },
    async lockChallenge(id) { return challenges.get(id) ?? null },
    async recordChallengeAttempt(id, consumedAt) {
      const c = challenges.get(id)!
      c.attempts++
      c.consumedAt = consumedAt ?? c.consumedAt
    },
    async invalidateChallenge(id, now) { challenges.get(id)!.consumedAt = now },
    async createAccount(account) {
      if ([...accounts.values()].some((a) => a.email === account.email)) return null
      accounts.set(account.id, { ...account })
      return { ...account }
    },
    async findAccountByEmail(email) { return [...accounts.values()].find((a) => a.email === email) ?? null },
    async lockAccount(id) { return accounts.get(id) ?? null },
    async setPassword(id, hash) { accounts.get(id)!.passwordHash = hash },
    async changeEmail(id, email) {
      if ([...accounts.values()].some((a) => a.email === email && a.id !== id)) return false
      const account = accounts.get(id)!
      accounts.set(id, { ...account, email, emailVerified: true })
      return true
    },
    async verifyEmail(id) { accounts.get(id)!.emailVerified = true },
    async saveSession(s) { sessions.set(s.tokenHash, { ...s, revoked: false }) },
    async findSession(hash, now) {
      const s = sessions.get(hash)
      const account = s && accounts.get(s.userId)
      return s && !s.revoked && s.expiresAt > now && account?.status === 'active'
        ? { account: { ...account }, expiresAt: s.expiresAt } : null
    },
    async revokeSession(hash) { const s = sessions.get(hash); if (s) s.revoked = true },
    async revokeUserSessions(id) { for (const s of sessions.values()) if (s.userId === id) s.revoked = true },
  }
  const service = new AuthService({
    transaction: { run: (work) => work({ auth: repository }) },
    email: { async sendChallenge(message) { if (mailFailure) throw new Error('SMTP 失败'); mail.push(message) } },
    secret: 'test-secret-with-at-least-32-characters', policy: { ...defaultAuthPolicy }, now: () => time,
  })
  return {
    service, mail, repository,
    advance(seconds: number) { time = new Date(time.getTime() + seconds * 1000) },
    failMail() { mailFailure = true },
    async register(email = 'ref@example.com', password?: string) {
      const challenge = await service.issueChallenge({ email, purpose: 'register' }, '127.0.0.1')
      return service.register({ challengeId: challenge.challengeId, code: mail.at(-1)!.code,
        displayName: '裁判', ...(password === undefined ? {} : { password }) })
    },
  }
}
