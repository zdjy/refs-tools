import { buildApp } from './app.js'
import { buildMediaService } from './media-bootstrap.js'
import { createDatabasePool, databaseConfigFromEnvironment } from './infrastructure/database/pool.js'
import { createTransactionRunner } from './infrastructure/database/transaction.js'
import { AuthService } from './modules/auth/auth.service.js'
import { AdminUsersService } from './modules/auth/admin-users.service.js'
import { OrganizationMembersService } from './modules/organizations/organization-members.service.js'
import { OrganizationInvitationsService } from './modules/organizations/organization-invitations.service.js'
import { PgOrganizationMembersRepository } from './modules/organizations/organization-members.repository.js'
import { OrganizationsService } from './modules/organizations/organizations.service.js'
import { PgOrganizationsRepository } from './modules/organizations/organizations.repository.js'
import { PgAdminUsersRepository } from './modules/auth/admin-users.repository.js'
import { hashPassword } from './modules/auth/auth.security.js'
import { PgAuthRepository } from './modules/auth/auth.repository.js'
import { authPolicyFromEnvironment } from './modules/auth/auth.config.js'
import { createSmtpEmailProvider } from './providers/email/smtp.js'
import { AuditService } from './modules/audit/audit.service.js'
import { PgAuditRepository } from './modules/audit/audit.repository.js'
import { PgAuthorizationRepository } from './modules/authorization/authorization.repository.js'
import { createCasbinPermissionEvaluator } from './infrastructure/authorization/casbin.js'

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
  const permissions = await createCasbinPermissionEvaluator()
  const pool = createDatabasePool(databaseConfigFromEnvironment(env))
  const service = new AuthService({
    transaction: createTransactionRunner(pool, (client) => ({ auth: new PgAuthRepository(client) })),
    email, secret, policy, now: () => new Date(),
  })
  try {
    const media = buildMediaService(env, pool, permissions)
    const memberDependencies = {
      transaction: createTransactionRunner(pool, client => ({
        members: new PgOrganizationMembersRepository(client), organizations: new PgOrganizationsRepository(client),
        identities: new PgAdminUsersRepository(client), authorization: new PgAuthorizationRepository(client), audit: new PgAuditRepository(client),
      })), permissions, now: () => new Date(),
    }
    return await buildApp({ logger: true }, {
      organizationMembers: { sessions: service, publicOrigin, members: new OrganizationMembersService(memberDependencies),
        invitations: new OrganizationInvitationsService(memberDependencies) },
      auth: { service, publicOrigin },
      adminUsers: { sessions: service, publicOrigin, service: new AdminUsersService({
        transaction: createTransactionRunner(pool, (client) => ({
          users: new PgAdminUsersRepository(client), sessions: new PgAuthRepository(client),
          authorization: new PgAuthorizationRepository(client), audit: new PgAuditRepository(client),
        })), permissions, now: () => new Date(), passwordMinLength: policy.passwordMinLength, hashPassword,
      }) },
      organizations: { sessions: service, publicOrigin, service: new OrganizationsService({
        transaction: createTransactionRunner(pool, (client) => ({
          organizations: new PgOrganizationsRepository(client), identities: new PgAdminUsersRepository(client),
          authorization: new PgAuthorizationRepository(client), audit: new PgAuditRepository(client),
        })), permissions, now: () => new Date(),
      }) },
      ...(media ? { media: { service: media.service, sessions: service, publicOrigin },
        adminMedia: { service: media.adminService, sessions: service, publicOrigin }, storageEvents: media } : {}),
      audit: { sessions: service, service: new AuditService({
        transaction: createTransactionRunner(pool, (client) => ({
          authorization: new PgAuthorizationRepository(client), audit: new PgAuditRepository(client),
        })), now: () => new Date(), permissions,
      }) },
      close: async () => { await pool.end() },
    })
  } catch (error) {
    await pool.end()
    throw error
  }
}
