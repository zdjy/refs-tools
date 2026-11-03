import type { FastifyPluginAsync } from 'fastify'
import { apiResponse } from '@refs-tools/contracts'
import type { AuditQuery, OrganizationAuditParams } from '@refs-tools/contracts/audit'
import type { SessionService } from '../auth/session.service.js'
import { sessionToken } from '../auth/auth.http.js'
import type { AuditService } from './audit.service.js'
import { organizationAuditListSchema } from './audit.schema.js'

export type AuditRouteDependencies = { service: AuditService; sessions: Pick<SessionService, 'requireSession'> }

/** 审计端点复用当前 Cookie 会话；所有响应（含拒绝）禁止缓存。 */
export function auditRoutes(dependencies: AuditRouteDependencies): FastifyPluginAsync {
  return async (app) => {
    app.addHook('onRequest', async (_request, reply) => {
      reply.header('cache-control', 'no-store').header('vary', 'Cookie')
    })
    app.get<{ Params: OrganizationAuditParams; Querystring: AuditQuery }>(
      '/organizations/:orgId/audit-events', { schema: organizationAuditListSchema }, async (request) => {
        const { user } = await dependencies.sessions.requireSession(sessionToken(request))
        return apiResponse(await dependencies.service.listOrganization(user.id, request.params.orgId, request.query))
      })
  }
}
