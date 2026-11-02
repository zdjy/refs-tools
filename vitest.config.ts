import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { conditions: ['development', 'import', 'default'] },
  test: {
    include: ['packages/**/test/**/*.test.ts', 'apps/**/test/**/*.test.ts'],
    exclude: [...configDefaults.exclude, 'apps/api/test/db/migration.test.ts', 'apps/api/test/**/*.integration.test.ts'],
    reporters: ['default'],
    pool: 'threads',
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
  },
})
