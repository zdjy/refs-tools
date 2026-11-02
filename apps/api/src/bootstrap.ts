import { buildApp } from './app.js'
import { createDatabasePool, databaseConfigFromEnvironment } from './infrastructure/database/pool.js'
import { createTransactionRunner } from './infrastructure/database/transaction.js'
import { AuthService } from './modules/auth/auth.service.js'
import { PgAuthRepository } from './modules/auth/auth.repository.js'
import { authPolicyFromEnvironment } from './modules/auth/auth.config.js'
import { createSmtpEmailProvider } from './providers/email/smtp.js'
import { AuditService } from './modules/audit/audit.service.js'
import { PgAuditRepository } from './modules/audit/audit.repository.js'
import { PgAuthorizationRepository } from './modules/authorization/authorization.repository.js'

/** 生产入口显式装配连接池、provider 与 Service，关闭实例时释放连接。 */
export async function buildProductionApp(env: NodeJS.ProcessEnv = process.env) {
  const secret = env['AUTH_CHALLENGE_SECRET']
  const publicOrigin = env['AUTH_PUBLIC_ORIGIN']
  if (!secret || Buffer.byteLength(secret) < 32) throw new Error('AUTH_CHALLENGE_SECRET requires at least 32 bytes')
  if (!publicOrigin || new URL(publicOrigin).origin !== publicOrigin || !publicOrigin.startsWith('https://')) {
    throw new Error('AUTH_PUBLIC_ORIGIN must be an exact HTTPS origin')
  }
  const policy = authPolicyFromEnvironment(env)
  const email = createSmtpEmailProvider(env)
  const pool = createDatabasePool(databaseConfigFromEnvironment(env))
  const service = new AuthService({
    transaction: createTransactionRunner(pool, (client) => ({ auth: new PgAuthRepository(client) })),
    email, secret, policy, now: () => new Date(),
  })
  try {
    return await buildApp({ logger: true }, {
      auth: { service, publicOrigin },
      audit: { sessions: service, service: new AuditService({
        transaction: createTransactionRunner(pool, (client) => ({
          authorization: new PgAuthorizationRepository(client), audit: new PgAuditRepository(client),
        })), now: () => new Date(),
      }) },
      close: async () => { await pool.end() },
    })
  } catch (error) {
    await pool.end()
    throw error
  }
}
