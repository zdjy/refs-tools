import { createDatabasePool, databaseConfigFromEnvironment } from './pool.js'
import { cleanupAuthRecords } from './auth-maintenance.js'

const pool = createDatabasePool({ ...databaseConfigFromEnvironment(), max: 1 })
try {
  console.info(await cleanupAuthRecords(pool))
} catch {
  console.error('认证记录清理失败，请检查数据库配置与迁移')
  process.exitCode = 1
} finally { await pool.end() }
