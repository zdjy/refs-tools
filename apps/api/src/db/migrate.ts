import { fileURLToPath } from 'node:url'
import { createDatabasePool, databaseConfigFromEnvironment } from './pool.js'
import { loadMigrations, migrateDown, migrateUp } from './migrations.js'

const directory = fileURLToPath(new URL('../../db/migrations/', import.meta.url))
const direction = process.argv[2] ?? 'up'
if (direction !== 'up' && direction !== 'down') throw new Error('Usage: db:migrate [up|down]')

const pool = createDatabasePool(databaseConfigFromEnvironment())
try {
  const migrations = await loadMigrations(directory)
  if (direction === 'up') {
    console.log(`Applied: ${(await migrateUp(pool, migrations)).join(', ') || 'none'}`)
  } else {
    console.log(`Rolled back: ${(await migrateDown(pool, migrations)) ?? 'none'}`)
  }
} catch {
  // 底层连接异常可能包含连接参数，不直接输出异常对象。
  console.error('数据库迁移失败，请检查连接配置与迁移文件')
  process.exitCode = 1
} finally {
  await pool.end()
}
