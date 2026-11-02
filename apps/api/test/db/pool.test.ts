import { describe, expect, it } from 'vitest'
import { createDatabasePool, databaseConfigFromEnvironment } from '../../src/db/pool.js'

describe('数据库连接池配置', () => {
  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('拒绝无效连接数 %s', (max) => {
    expect(() => createDatabasePool({ max })).toThrow(/positive integer/)
  })

  it('拒绝无效环境配置，避免静默放宽连接数', () => {
    expect(() => databaseConfigFromEnvironment({ DATABASE_POOL_MAX: 'invalid' })).toThrow()
  })

  it('迁移配置不回退到测试库', () => {
    const config = databaseConfigFromEnvironment({ TEST_DATABASE_URL: 'postgres://example/test' })
    expect(config.connectionString).toBeUndefined()
  })
})
