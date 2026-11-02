import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { Pool, PoolClient } from 'pg'
import { withTransaction } from './pool.js'

export type Migration = { id: string; name: string; up: string; down: string }
type MigrationRecord = { id: string; name: string }

/** 加载按编号升序排列、各含一组 up/down 标记的 SQL；重复编号或畸形文件直接失败。 */
export async function loadMigrations(directory: string): Promise<Migration[]> {
  const names = (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort()
  const migrations = await Promise.all(names.map(async (fileName) => {
    const match = /^(\d{4})_([a-z0-9_-]+)\.sql$/.exec(fileName)
    if (!match) throw new Error(`Invalid migration filename: ${fileName}`)
    const content = await readFile(join(directory, fileName), 'utf8')
    const sections = /^-- migrate:up\s*\r?\n([\s\S]+?)^-- migrate:down\s*\r?\n([\s\S]+)$/m.exec(content)
    if (!sections || (content.match(/^-- migrate:(up|down)\s*$/gm)?.length ?? 0) !== 2) {
      throw new Error(`Invalid migration sections: ${fileName}`)
    }
    const up = sections[1]!.trim()
    const down = sections[2]!.trim()
    if (!up || !down) throw new Error(`Empty migration section: ${fileName}`)
    return { id: match[1]!, name: match[2]!, up, down }
  }))
  if (new Set(migrations.map(({ id }) => id)).size !== migrations.length) {
    throw new Error('Duplicate migration ID')
  }
  return migrations
}

/** 同一事务内串行应用全部待执行迁移；事务锁防止并发迁移读取过期状态。 */
export async function migrateUp(pool: Pool, migrations: Migration[]): Promise<string[]> {
  return withTransaction(pool, async (client) => {
    await initializeMigrations(client)
    const applied = await appliedMigrations(client)
    const pending = migrations.filter(({ id }) => !applied.some((record) => record.id === id))
    for (const migration of pending) {
      await client.query(migration.up)
      await client.query('INSERT INTO schema_migrations (id, name) VALUES ($1, $2)',
        [migration.id, migration.name])
    }
    return pending.map(({ id }) => id)
  })
}

/** 回滚最后一条迁移；无已应用迁移返回 null，缺失对应 SQL 则失败并保留历史。 */
export async function migrateDown(pool: Pool, migrations: Migration[]): Promise<string | null> {
  return withTransaction(pool, async (client) => {
    await initializeMigrations(client)
    const latest = (await appliedMigrations(client)).at(-1)
    if (!latest) return null
    const migration = migrations.find(({ id }) => id === latest.id)
    if (!migration) throw new Error(`Migration file not found: ${latest.id}`)
    await client.query(migration.down)
    await client.query('DELETE FROM schema_migrations WHERE id = $1', [migration.id])
    return migration.id
  })
}

/** 读取迁移历史；调用方必须先应用或回滚一次以初始化迁移表。 */
export async function appliedMigrations(connection: Pick<PoolClient, 'query'>): Promise<MigrationRecord[]> {
  return (await connection.query<MigrationRecord>('SELECT id, name FROM schema_migrations ORDER BY id')).rows
}

async function initializeMigrations(client: PoolClient): Promise<void> {
  // 固定应用级锁在建表前获取；事务结束或连接丢失时由 PostgreSQL 自动释放。
  await client.query('SELECT pg_advisory_xact_lock(723601, 2)')
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id text PRIMARY KEY,
    name text NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`)
}
