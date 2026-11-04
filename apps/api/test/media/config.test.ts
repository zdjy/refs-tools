import { expect, it } from 'vitest'
import { buildProductionApp } from '../../src/bootstrap.js'

it('媒体关闭不要求 OSS；启用或非法开关配置不能静默降级', async () => {
  const env = { AUTH_CHALLENGE_SECRET: 'synthetic-auth-secret-at-least-32-bytes', AUTH_PUBLIC_ORIGIN: 'https://refs.example.com',
    SMTP_HOST: 'smtp.example.com', SMTP_FROM: 'no-reply@example.com' }
  await expect(buildProductionApp({ ...env, MEDIA_ENABLED: 'yes' })).rejects.toThrow('MEDIA_ENABLED')
  await expect(buildProductionApp({ ...env, MEDIA_ENABLED: 'true' })).rejects.toThrow('MEDIA_EVENT_SECRET')
  await expect(buildProductionApp({ ...env, MEDIA_ENABLED: 'true', MEDIA_EVENT_SECRET: 'synthetic-event-secret-at-least-32-bytes' })).rejects.toThrow('OSS_BUCKET')
  const mediaEnv = { ...env, MEDIA_ENABLED: 'true', MEDIA_EVENT_SECRET: 'synthetic-event-secret-at-least-32-bytes' }
  await expect(buildProductionApp({ ...mediaEnv, MEDIA_STORAGE_PROVIDER: 'unknown' })).rejects.toThrow('MEDIA_STORAGE_PROVIDER')
  await expect(buildProductionApp({ ...mediaEnv, MEDIA_STORAGE_PROVIDER: 's3' })).rejects.toThrow('S3_BUCKET')
  const s3App = await buildProductionApp({ ...mediaEnv, MEDIA_STORAGE_PROVIDER: 's3', S3_BUCKET: 'synthetic-bucket',
    S3_REGION: 'us-east-1', S3_ENDPOINT: 'http://minio:9000', S3_PUBLIC_ENDPOINT: 'https://localhost:9443',
    S3_ACCESS_KEY_ID: 'synthetic-key', S3_SECRET_ACCESS_KEY: 'synthetic-secret' })
  try { expect(s3App.hasRoute({ method: 'POST', url: '/api/v1/media/upload-intents' })).toBe(true) } finally { await s3App.close() }
  const app = await buildProductionApp(env)
  try { expect((await app.inject('/api/v1/media/upload-intents')).statusCode).toBe(404) } finally { await app.close() }
})
