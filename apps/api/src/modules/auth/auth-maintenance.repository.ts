import type { PoolClient } from 'pg'

/** 清理模块拥有的短期认证记录；每表每批有界，允许多个维护进程跳过已锁行。 */
export async function deleteExpiredAuthRecords(connection: Pick<PoolClient, 'query'>, now: Date, batch: number) {
  const challenges = await connection.query(`DELETE FROM email_challenges WHERE id IN
    (SELECT id FROM email_challenges WHERE expires_at <= $1 ORDER BY expires_at LIMIT $2 FOR UPDATE SKIP LOCKED)`, [now, batch])
  const sessions = await connection.query(`DELETE FROM auth_sessions WHERE token_hash IN
    (SELECT token_hash FROM auth_sessions WHERE expires_at <= $1 ORDER BY expires_at LIMIT $2 FOR UPDATE SKIP LOCKED)`, [now, batch])
  const rates = await connection.query(`DELETE FROM auth_rate_limits WHERE key IN
    (SELECT key FROM auth_rate_limits WHERE expires_at <= $1 ORDER BY expires_at LIMIT $2 FOR UPDATE SKIP LOCKED)`, [now, batch])
  return { challenges: challenges.rowCount ?? 0, sessions: sessions.rowCount ?? 0, rateLimits: rates.rowCount ?? 0 }
}
