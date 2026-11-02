import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestDatabase, applyTestMigrations, type TestDatabase } from '../helpers/database.js'
import { cleanupAuthRecords } from '../../src/infrastructure/database/auth-maintenance.js'

describe('认证短期记录清理', () => {
  let db: TestDatabase
  beforeAll(async () => { db = await createTestDatabase(); await applyTestMigrations(db.pool) })
  afterAll(async () => { await db?.close() })
  it('每批有界删除过期记录，不影响仍有效的频控窗口', async () => {
    await db.pool.query(`INSERT INTO auth_rate_limits (key, window_started_at, expires_at, count)
      VALUES ('expired-1', '2026-11-01Z', '2026-11-01Z', 1),
             ('expired-2', '2026-11-01Z', '2026-11-01Z', 1),
             ('active', '2026-11-02Z', '2026-11-03Z', 1)`)
    const result = await cleanupAuthRecords(db.pool, new Date('2026-11-02T00:00:00Z'), 1)
    expect(result.rateLimits).toBe(1)
    expect((await db.pool.query('SELECT count(*)::int AS count FROM auth_rate_limits')).rows[0].count).toBe(2)
    await cleanupAuthRecords(db.pool, new Date('2026-11-02T00:00:00Z'), 100)
    expect((await db.pool.query('SELECT key FROM auth_rate_limits')).rows).toEqual([{ key: 'active' }])
  })
})
