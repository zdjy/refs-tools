import type { PoolClient } from 'pg'
import type { AuthAccount, AuthRepository, EmailChallenge, StoredSession } from './auth.types.js'

type AccountRow = {
  id: string; email: string; display_name: string; email_verified_at: Date | null
  password_hash: string | null; status: AuthAccount['status']
}
const accountColumns = 'id, email, display_name, email_verified_at, password_hash, status'
function accountFromRow(row: AccountRow): AuthAccount {
  return {
    id: row.id, email: row.email, displayName: row.display_name,
    emailVerified: row.email_verified_at !== null, passwordHash: row.password_hash, status: row.status,
  }
}

/** 身份模块唯一持久化入口；由事务工厂绑定同一连接。 */
export class PgAuthRepository implements AuthRepository {
  constructor(private readonly connection: Pick<PoolClient, 'query'>) {}

  async takeRateLimit(key: string, now: Date, windowSeconds: number, limit: number): Promise<boolean> {
    // 冲突更新与限额判定同条 SQL，避免并发请求各自通过先查再写。
    const result = await this.connection.query(`
      INSERT INTO auth_rate_limits (key, window_started_at, expires_at, count)
      VALUES ($1, $2, $2::timestamptz + $3 * interval '1 second', 1)
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN auth_rate_limits.expires_at <= $2 THEN 1 ELSE auth_rate_limits.count + 1 END,
        window_started_at = CASE WHEN auth_rate_limits.expires_at <= $2 THEN $2 ELSE auth_rate_limits.window_started_at END,
        expires_at = CASE WHEN auth_rate_limits.expires_at <= $2 THEN $2::timestamptz + $3 * interval '1 second' ELSE auth_rate_limits.expires_at END
      WHERE auth_rate_limits.expires_at <= $2 OR auth_rate_limits.count < $4
      RETURNING count
    `, [key, now, windowSeconds, limit])
    return result.rowCount === 1
  }

  async saveChallenge(c: EmailChallenge): Promise<void> {
    await this.connection.query(`INSERT INTO email_challenges
      (id, email, purpose, code_hash, expires_at) VALUES ($1, $2, $3, $4, $5)`,
    [c.id, c.email, c.purpose, c.codeHash, c.expiresAt])
  }

  async lockChallenge(id: string): Promise<EmailChallenge | null> {
    const result = await this.connection.query<{
      id: string; email: string; purpose: EmailChallenge['purpose']; code_hash: string
      expires_at: Date; attempts: number; consumed_at: Date | null
    }>(`SELECT id, email, purpose, code_hash, expires_at, attempts, consumed_at
        FROM email_challenges WHERE id = $1 FOR UPDATE`, [id])
    const row = result.rows[0]
    return row ? {
      id: row.id, email: row.email, purpose: row.purpose, codeHash: row.code_hash,
      expiresAt: row.expires_at, attempts: row.attempts, consumedAt: row.consumed_at,
    } : null
  }

  async recordChallengeAttempt(id: string, consumedAt: Date | null): Promise<void> {
    await this.connection.query(`UPDATE email_challenges SET attempts = attempts + 1,
      consumed_at = COALESCE($2, consumed_at) WHERE id = $1`, [id, consumedAt])
  }

  async invalidateChallenge(id: string, now: Date): Promise<void> {
    await this.connection.query('UPDATE email_challenges SET consumed_at = $2 WHERE id = $1', [id, now])
  }

  async createAccount(account: AuthAccount): Promise<AuthAccount | null> {
    const result = await this.connection.query<AccountRow>(`INSERT INTO users
      (id, email, display_name, email_verified_at, password_hash, status)
      VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT ON CONSTRAINT users_email_unique DO NOTHING
      RETURNING ${accountColumns}`, [account.id, account.email, account.displayName,
      account.emailVerified ? new Date() : null, account.passwordHash, account.status])
    return result.rows[0] ? accountFromRow(result.rows[0]) : null
  }

  async findAccountByEmail(email: string): Promise<AuthAccount | null> {
    const result = await this.connection.query<AccountRow>(`SELECT ${accountColumns} FROM users WHERE email = $1`, [email])
    return result.rows[0] ? accountFromRow(result.rows[0]) : null
  }

  async lockAccount(id: string): Promise<AuthAccount | null> {
    const result = await this.connection.query<AccountRow>(`SELECT ${accountColumns} FROM users WHERE id = $1 FOR UPDATE`, [id])
    return result.rows[0] ? accountFromRow(result.rows[0]) : null
  }

  async setPassword(userId: string, hash: string): Promise<void> {
    await this.connection.query('UPDATE users SET password_hash = $2 WHERE id = $1', [userId, hash])
  }

  async verifyEmail(userId: string, now: Date): Promise<void> {
    await this.connection.query('UPDATE users SET email_verified_at = COALESCE(email_verified_at, $2) WHERE id = $1', [userId, now])
  }

  async saveSession(s: StoredSession): Promise<void> {
    await this.connection.query('INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
      [s.tokenHash, s.userId, s.expiresAt])
  }

  async findSession(tokenHash: string, now: Date): Promise<{ account: AuthAccount; expiresAt: Date } | null> {
    const result = await this.connection.query<AccountRow & { expires_at: Date }>(`SELECT
      u.id, u.email, u.display_name, u.email_verified_at, u.password_hash, u.status, s.expires_at
      FROM auth_sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > $2 AND s.revoked_at IS NULL AND u.status = 'active'`, [tokenHash, now])
    const row = result.rows[0]
    return row ? { account: accountFromRow(row), expiresAt: row.expires_at } : null
  }

  async revokeSession(tokenHash: string, now: Date): Promise<void> {
    await this.connection.query('UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, $2) WHERE token_hash = $1', [tokenHash, now])
  }

  async revokeUserSessions(userId: string, now: Date): Promise<void> {
    await this.connection.query('UPDATE auth_sessions SET revoked_at = $2 WHERE user_id = $1 AND revoked_at IS NULL', [userId, now])
  }
}
