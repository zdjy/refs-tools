import { randomBytes } from 'node:crypto'
import type { AuthUser, PasswordLoginBody } from '@refs-tools/contracts/auth'
import { DomainError } from '../../application/errors.js'
import { digest, verifyPassword } from './auth.security.js'
import type { AuthAccount, AuthDependencies, AuthRepository, SessionGrant } from './auth.types.js'

function publicUser(account: AuthAccount): AuthUser {
  return { id: account.id, email: account.email, displayName: account.displayName,
    emailVerified: account.emailVerified, hasPassword: account.passwordHash !== null }
}

/** 可撤销会话用例；每次门禁重新读取用户和会话的当前状态。 */
export class SessionService {
  constructor(protected readonly dependencies: AuthDependencies) {}

  async loginWithPassword(input: PasswordLoginBody, ip: string): Promise<SessionGrant> {
    const email = input.email.trim().toLowerCase()
    await this.limit('login', email, ip)
    const account = await this.dependencies.transaction.run(({ auth }) => auth.findAccountByEmail(email))
    const valid = await verifyPassword(input.password, account?.passwordHash ?? null)
    if (!valid || !account || account.status !== 'active') {
      throw new DomainError('INVALID_CREDENTIALS', '邮箱或密码错误', 401)
    }
    return this.dependencies.transaction.run(async ({ auth }) => {
      const current = await auth.lockAccount(account.id)
      if (!current || current.status !== 'active' || current.passwordHash !== account.passwordHash) {
        throw new DomainError('INVALID_CREDENTIALS', '邮箱或密码错误', 401)
      }
      return this.createSession(auth, current)
    })
  }

  async requireSession(token: string | undefined): Promise<{ user: AuthUser; expiresAt: string }> {
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw this.unauthorized()
    const session = await this.dependencies.transaction.run(({ auth }) => auth.findSession(digest(token), this.dependencies.now()))
    if (!session) throw this.unauthorized()
    return { user: publicUser(session.account), expiresAt: session.expiresAt.toISOString() }
  }

  async requireVerifiedSession(token: string | undefined): Promise<{ user: AuthUser; expiresAt: string }> {
    const session = await this.requireSession(token)
    if (!session.user.emailVerified) throw new DomainError('EMAIL_NOT_VERIFIED', '请先验证邮箱', 403)
    return session
  }

  async logout(token: string | undefined): Promise<void> {
    if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) {
      await this.dependencies.transaction.run(({ auth }) => auth.revokeSession(digest(token), this.dependencies.now()))
    }
  }

  protected async createSession(auth: AuthRepository, account: AuthAccount): Promise<SessionGrant> {
    const token = randomBytes(32).toString('base64url')
    const expiresAt = new Date(this.dependencies.now().getTime() + this.dependencies.policy.sessionTtlSeconds * 1000)
    await auth.saveSession({ tokenHash: digest(token), userId: account.id, expiresAt })
    return { user: publicUser(account), token, expiresAt: expiresAt.toISOString() }
  }

  protected async limit(kind: 'send' | 'login', email: string, ip: string): Promise<void> {
    const p = this.dependencies.policy
    const window = kind === 'send' ? p.sendWindowSeconds : p.loginWindowSeconds
    const ipAllowed = await this.dependencies.transaction.run(({ auth }) => auth.takeRateLimit(
      `${kind}:ip:${digest(ip)}`, this.dependencies.now(), window,
      kind === 'send' ? p.sendIpLimit : p.loginIpLimit,
    ))
    if (!ipAllowed) throw new DomainError('RATE_LIMITED', '操作过于频繁，请稍后重试', 429)
    const emailAllowed = await this.dependencies.transaction.run(({ auth }) => auth.takeRateLimit(
      `${kind}:email:${digest(email)}`, this.dependencies.now(), window,
      kind === 'send' ? p.sendEmailLimit : p.loginEmailLimit,
    ))
    if (!emailAllowed) throw new DomainError('RATE_LIMITED', '操作过于频繁，请稍后重试', 429)
  }

  private unauthorized(): DomainError {
    return new DomainError('UNAUTHENTICATED', '请重新登录', 401)
  }
}
