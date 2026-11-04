import { expect, it } from 'vitest'
import { buildProductionApp } from '../../src/bootstrap.js'

it('媒体关闭不要求 OSS；启用或非法开关配置不能静默降级', async () => {
  const env = { AUTH_CHALLENGE_SECRET: 'synthetic-auth-secret-at-least-32-bytes', AUTH_PUBLIC_ORIGIN: 'https://refs.example.com',
    SMTP_HOST: 'smtp.example.com', SMTP_FROM: 'no-reply@example.com' }
  await expect(buildProductionApp({ ...env, MEDIA_ENABLED: 'yes' })).rejects.toThrow('MEDIA_ENABLED')
  await expect(buildProductionApp({ ...env, MEDIA_ENABLED: 'true' })).rejects.toThrow('MEDIA_EVENT_SECRET')
  await expect(buildProductionApp({ ...env, MEDIA_ENABLED: 'true', MEDIA_EVENT_SECRET: 'synthetic-event-secret-at-least-32-bytes' })).rejects.toThrow('OSS_BUCKET')
  const app = await buildProductionApp(env)
  try { expect((await app.inject('/api/v1/media/upload-intents')).statusCode).toBe(404) } finally { await app.close() }
})
