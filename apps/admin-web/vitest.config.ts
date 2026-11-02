import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { conditions: ['development', 'import', 'default'] },
  test: {
    include: ['test/**/*.test.ts'], environment: 'node', pool: 'threads',
    fileParallelism: false, maxWorkers: 1, minWorkers: 1,
  },
})
