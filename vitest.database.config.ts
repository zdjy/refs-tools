import { defineConfig } from 'vitest/config'

if (!process.env['TEST_DATABASE_URL']) {
  throw new Error('数据库集成测试必须显式设置 TEST_DATABASE_URL')
}

export default defineConfig({
  resolve: { conditions: ['development', 'import', 'default'] },
  test: {
    include: ['apps/api/test/db/migration.test.ts', 'apps/api/test/**/*.integration.test.ts'],
    pool: 'threads',
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
    testTimeout: 10_000,
    hookTimeout: 10_000,
  },
})
