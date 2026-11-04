import { randomInt, randomUUID } from 'node:crypto'
import type { ChallengeProof, ChallengePurpose, EmailChallengeBody, EmailChangeBody, RegisterBody, SetPasswordBody } from '@refs-tools/contracts/auth'
import { DomainError } from '../../application/errors.js'
import { challengeDigest, digest, equalDigest, hashPassword, verifyPassword } from './auth.security.js'
import type { AuthAccount, AuthDependencies, AuthRepository, EmailChallenge, SessionGrant } from './auth.types.js'
import { SessionService } from './session.service.js'

/** 邮箱 challenge 的签发与一次性消费；外部邮件只在事务提交后发送。 */
export class AuthService extends SessionService {
  constructor(dependencies: AuthDependencies) { super(dependencies) }

  async issueChallenge(input: EmailChallengeBody, ip: string): Promise<{ challengeId: string; expiresAt: string }> {
    const now = this.dependencies.now()
    const email = input.email.trim().toLowerCase()
    const id = randomUUID()
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0')
    const expiresAt = new Date(now.getTime() + this.dependencies.policy.challengeTtlSeconds * 1000)
    await this.limit('send', email, ip)
    await this.dependencies.transaction.run(async ({ auth }) => {
      await auth.saveChallenge({ id, email, purpose: input.purpose,
        codeHash: challengeDigest(this.dependencies.secret, id, code), expiresAt, attempts: 0, consumedAt: null })
    })
    try { await this.dependencies.email.sendChallenge({ email, code, purpose: input.purpose, expiresAt }) }
    catch {
      await this.dependencies.transaction.run(({ auth }) => auth.invalidateChallenge(id, now))
      throw new DomainError('EMAIL_UNAVAILABLE', '邮件暂时无法发送，请稍后重试', 503)
    }
    return { challengeId: id, expiresAt: expiresAt.toISOString() }
  }

  async register(input: RegisterBody): Promise<SessionGrant> {
    const displayName = input.displayName.trim()
    if (!displayName) throw new DomainError('INVALID_DISPLAY_NAME', '请填写显示名称', 422)
    return this.consume(input, 'register', undefined, async (auth, challenge) => {
      const passwordHash = input.password === undefined ? null : await this.passwordHash(input.password)
      const account = await auth.createAccount({ id: randomUUID(), email: challenge.email, displayName,
        emailVerified: true, passwordHash, status: 'active' })
      if (!account) return new DomainError('INVALID_CHALLENGE', '验证码无效或无法完成操作', 400)
      return this.createSession(auth, account)
    })
  }

  async loginWithCode(input: ChallengeProof & { email: string }, ip: string): Promise<SessionGrant> {
    await this.limit('login', input.email.trim().toLowerCase(), ip)
    return this.consume(input, 'login', input.email.trim().toLowerCase(), async (auth, challenge) => {
      const candidate = await auth.findAccountByEmail(challenge.email)
      const account = candidate && await auth.lockAccount(candidate.id)
      if (!account || account.status !== 'active') return this.invalidChallenge()
      await auth.verifyEmail(account.id, this.dependencies.now())
      return this.createSession(auth, { ...account, emailVerified: true })
    })
  }

  async setPassword(token: string | undefined, input: SetPasswordBody): Promise<SessionGrant> {
    const session = await this.requireSession(token)
    if (!('challengeId' in input)) {
      return this.dependencies.transaction.run(async ({ auth }) => {
        // 与密码修改共用账号锁，并在锁内重验会话，防止并发首次设置覆盖已设置的密码。
        const account = await auth.lockAccount(session.user.id)
        const current = await auth.findSession(digest(token!), this.dependencies.now())
        if (!account || account.status !== 'active' || !current) {
          throw new DomainError('UNAUTHENTICATED', '请重新登录', 401)
        }
        if (!account.emailVerified) throw new DomainError('EMAIL_NOT_VERIFIED', '请先验证邮箱', 403)
        if (account.passwordHash !== null) {
          throw new DomainError('PASSWORD_VERIFICATION_REQUIRED', '更换已有密码需要重新验证邮箱', 403)
        }
        return this.updatePassword(auth, account, input.newPassword)
      })
    }
    return this.consume(input, 'password', session.user.email, async (auth) => {
      const account = await auth.lockAccount(session.user.id)
      const current = await auth.findSession(digest(token!), this.dependencies.now())
      if (!account || account.status !== 'active' || !current) return this.invalidChallenge()
      return this.updatePassword(auth, account, input.newPassword)
    })
  }

  /**
   * 更换登录邮箱：旧邮箱验证码 + 当前密码（无密码账号省略）+ 新邮箱验证码三者全过才切换。
   * 会话在事务外先解析、锁内重验；切换后邮箱立即标记已验证，其他设备会话全部失效。
   */
  async changeEmail(token: string | undefined, input: EmailChangeBody): Promise<SessionGrant> {
    const session = await this.requireSession(token)
    const email = input.newEmail.trim().toLowerCase()
    const result = await this.dependencies.transaction.run(async ({ auth }) => {
      const now = this.dependencies.now()
      const account = await auth.lockAccount(session.user.id)
      const current = await auth.findSession(digest(token!), now)
      if (!account || account.status !== 'active' || !current || account.email !== session.user.email) return this.invalidChallenge()
      if (email === account.email) return new DomainError('EMAIL_UNCHANGED', '新邮箱与当前邮箱相同', 422)
      if (account.passwordHash !== null && !await verifyPassword(input.password ?? '', account.passwordHash)) {
        return new DomainError('INVALID_CREDENTIALS', '当前密码不正确', 401)
      }
      // 先验密码再消费验证码，避免密码输错时连带烧掉两个验证码。
      if (!await this.verifyChallenge(auth, input.oldChallengeId, input.oldCode, account.email, now)
        || !await this.verifyChallenge(auth, input.newChallengeId, input.newCode, email, now)) return this.invalidChallenge()
      if (!await auth.changeEmail(account.id, email, now)) return new DomainError('EMAIL_TAKEN', '该邮箱已被其他账号使用', 409)
      await auth.revokeUserSessions(account.id, now)
      return this.createSession(auth, { ...account, email, emailVerified: true })
    })
    if (result instanceof DomainError) throw result
    return result
  }

  private async updatePassword(auth: AuthRepository, account: AuthAccount, password: string): Promise<SessionGrant> {
    const passwordHash = await this.passwordHash(password)
    await auth.setPassword(account.id, passwordHash)
    await auth.verifyEmail(account.id, this.dependencies.now())
    await auth.revokeUserSessions(account.id, this.dependencies.now())
    return this.createSession(auth, { ...account, passwordHash, emailVerified: true })
  }

  private async consume(
    proof: ChallengeProof, purpose: ChallengePurpose, email: string | undefined,
    work: (auth: AuthRepository, challenge: EmailChallenge) => Promise<SessionGrant | DomainError>,
  ): Promise<SessionGrant> {
    // 失败次数与已消费状态必须提交后才抛业务错误，否则回滚会恢复可猜测次数。
    const result = await this.dependencies.transaction.run(async ({ auth }) => {
      const challenge = await auth.lockChallenge(proof.challengeId)
      const now = this.dependencies.now()
      if (!challenge || challenge.consumedAt || challenge.expiresAt <= now
        || challenge.attempts >= this.dependencies.policy.challengeAttempts) return this.invalidChallenge()
      const valid = challenge.purpose === purpose && (email === undefined || challenge.email === email)
        && equalDigest(challenge.codeHash, challengeDigest(this.dependencies.secret, challenge.id, proof.code))
      await auth.recordChallengeAttempt(challenge.id, valid ? now : null)
      if (!valid) return this.invalidChallenge()
      try { return await work(auth, challenge) }
      catch (error) { if (error instanceof DomainError) return error; throw error }
    })
    if (result instanceof DomainError) throw result
    return result
  }

  private invalidChallenge(): DomainError {
    return new DomainError('INVALID_CHALLENGE', '验证码无效或无法完成操作', 400)
  }

  /** 锁内校验并消费单个 challenge；失败次数无论结果都随事务提交，防止回滚恢复可猜测次数。 */
  private async verifyChallenge(auth: AuthRepository, id: string, code: string, email: string, now: Date): Promise<boolean> {
    const challenge = await auth.lockChallenge(id)
    if (!challenge || challenge.consumedAt || challenge.expiresAt <= now
      || challenge.attempts >= this.dependencies.policy.challengeAttempts) return false
    const valid = challenge.purpose === 'email_change' && challenge.email === email
      && equalDigest(challenge.codeHash, challengeDigest(this.dependencies.secret, challenge.id, code))
    await auth.recordChallengeAttempt(challenge.id, valid ? now : null)
    return valid
  }

  private async passwordHash(password: string): Promise<string> {
    if (password.length < this.dependencies.policy.passwordMinLength || password.length > 128) {
      throw new DomainError('WEAK_PASSWORD', '密码长度不符合策略', 422)
    }
    return hashPassword(password)
  }
}
