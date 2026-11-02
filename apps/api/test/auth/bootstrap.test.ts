import { describe, expect, it } from 'vitest'
import { buildProductionApp } from '../../src/bootstrap.js'

describe('认证生产装配', () => {
  it('配置完整时装配路由并正常关闭，不隐式连接数据库或发邮件', async () => {
    const app = await buildProductionApp({
      AUTH_CHALLENGE_SECRET: 'test-assembly-secret-at-least-32-bytes',
      AUTH_PUBLIC_ORIGIN: 'https://refs.example.com', SMTP_HOST: 'smtp.example.com', SMTP_FROM: 'no-reply@example.com',
    })
    try {
      expect((await app.inject('/api/v1/health')).statusCode).toBe(200)
      expect((await app.inject('/api/v1/auth/session')).statusCode).toBe(401)
    } finally { await app.close() }
  })

  it('不允许缺失密钥、HTTP Origin 或不完整 SMTP 配置静默退化', async () => {
    await expect(buildProductionApp({})).rejects.toThrow('AUTH_CHALLENGE_SECRET')
    await expect(buildProductionApp({ AUTH_CHALLENGE_SECRET: 'test-assembly-secret-at-least-32-bytes',
      AUTH_PUBLIC_ORIGIN: 'http://refs.example.com' })).rejects.toThrow('AUTH_PUBLIC_ORIGIN')
    await expect(buildProductionApp({ AUTH_CHALLENGE_SECRET: 'test-assembly-secret-at-least-32-bytes',
      AUTH_PUBLIC_ORIGIN: 'https://refs.example.com' })).rejects.toThrow('SMTP_HOST')
  })
})
