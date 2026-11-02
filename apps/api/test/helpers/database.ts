import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import type { Pool, PoolClient } from 'pg'
import { createDatabasePool, withTransaction } from '../../src/db/pool.js'
import { loadMigrations, migrateUp } from '../../src/db/migrations.js'

export const migrationsDirectory = fileURLToPath(new URL('../../db/migrations/', import.meta.url))

export type TestDatabase = {
  pool: Pool
  reset: () => Promise<void>
  close: () => Promise<void>
}

/** 仅在显式测试 URL 下创建唯一 schema；不清理 public 或其他 schema。 */
export async function createTestDatabase(): Promise<TestDatabase> {
  const connectionString = process.env['TEST_DATABASE_URL']
  if (!connectionString) throw new Error('TEST_DATABASE_URL is required')
  const schema = `refs_test_${randomUUID().replaceAll('-', '')}`
  const admin = createDatabasePool({ connectionString, max: 1 })
  await admin.query(`CREATE SCHEMA "${schema}"`)
  const pool = createDatabasePool({
    connectionString,
    max: 2,
    connectionTimeoutMillis: 300,
    options: `-c search_path=${schema}`,
  })
  return {
    pool,
    async reset() {
      await admin.query(`DROP SCHEMA "${schema}" CASCADE`)
      await admin.query(`CREATE SCHEMA "${schema}"`)
    },
    async close() {
      try {
        await pool.end()
        await admin.query(`DROP SCHEMA "${schema}" CASCADE`)
      } finally {
        await admin.end()
      }
    },
  }
}

/** 应用真实迁移，不依赖测试专用 SQL 实现生产迁移行为。 */
export async function applyTestMigrations(pool: Pool): Promise<string[]> {
  return migrateUp(pool, await loadMigrations(migrationsDirectory))
}

/** 测试回调无论成功或失败都回滚，返回值保留；回滚异常沿用生产事务处理。 */
export async function withinRollback<T>(pool: Pool, callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const rollbackSignal = new Error('测试事务结束')
  let result: T
  try {
    await withTransaction(pool, async (client) => {
      result = await callback(client)
      throw rollbackSignal
    })
  } catch (error) {
    if (error !== rollbackSignal) throw error
  }
  return result!
}
