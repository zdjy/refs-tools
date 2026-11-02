import { buildProductionApp } from './bootstrap.js'

const port = Number(process.env['PORT'] ?? 3000)
const host = process.env['HOST'] ?? '0.0.0.0'

const app = await buildProductionApp()
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => { void app.close() })
}

try {
  await app.listen({ port, host })
} catch (error) {
  app.log.error('API 无法监听，请检查部署配置')
  await app.close()
  process.exitCode = 1
}
