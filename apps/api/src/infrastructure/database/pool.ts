import { Pool, type PoolConfig } from 'pg'

export type DatabaseConfig = PoolConfig

/** 创建延迟连接的池；连接数必须为正整数，默认最多 5 条。调用方负责 end。 */
export function createDatabasePool(config: DatabaseConfig = {}): Pool {
  const max = config.max ?? positiveInteger(process.env['DATABASE_POOL_MAX'], 5)
  if (!Number.isSafeInteger(max) || max < 1) {
    throw new Error('DATABASE_POOL_MAX must be a positive integer')
  }
  const pool = new Pool({
    ...config,
    max,
    idleTimeoutMillis: config.idleTimeoutMillis ?? 10_000,
    connectionTimeoutMillis: config.connectionTimeoutMillis ?? 5_000,
  })
  // pg 已移除故障空闲连接；只输出通用信息，避免底层异常夹带连接凭据。
  pool.on('error', () => console.error('数据库空闲连接已断开'))
  return pool
}

/** 读取迁移连接配置；测试库必须由测试 helper 显式选择。 */
export function databaseConfigFromEnvironment(env: NodeJS.ProcessEnv = process.env): DatabaseConfig {
  return {
    connectionString: env['DATABASE_URL'],
    host: env['PGHOST'],
    port: env['PGPORT'] === undefined ? undefined : positiveInteger(env['PGPORT']),
    database: env['PGDATABASE'],
    user: env['PGUSER'],
    password: env['PGPASSWORD'],
    max: positiveInteger(env['DATABASE_POOL_MAX'], 5),
  }
}

function positiveInteger(value: string | undefined, fallback?: number): number {
  if (value === undefined && fallback !== undefined) return fallback
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error('Database numeric configuration must be a positive integer')
  }
  return parsed
}
