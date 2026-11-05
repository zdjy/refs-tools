import type { FastifyPluginAsync } from 'fastify'
import { apiResponse } from '@refs-tools/contracts'
import type { CreateOrganization, OrganizationDecision, OrganizationParams, OrganizationQuery, UpdateOrganization } from '@refs-tools/contracts/organizations'
import type { SessionService } from '../auth/session.service.js'
import { requireSameOrigin, sessionToken } from '../auth/auth.http.js'
import type { OrganizationsService } from './organizations.service.js'
import { createOrganizationSchema, decideOrganizationSchema, detailOrganizationSchema, listOrganizationsSchema, updateOrganizationSchema } from './organizations.schema.js'

export type OrganizationsRouteDependencies = {
  service: OrganizationsService; sessions: Pick<SessionService, 'requireVerifiedSession'>; publicOrigin: string
}

/** 组织治理复用同源 Cookie 门禁，所有响应包括失败均禁止缓存。 */
export function organizationsRoutes({ service, sessions, publicOrigin }: OrganizationsRouteDependencies): FastifyPluginAsync {
  return async (app) => {
    app.addHook('onRequest', async (request, reply) => {
      reply.header('cache-control', 'no-store').header('vary', 'Cookie')
      requireSameOrigin(request, publicOrigin)
    })
    app.get<{ Querystring: OrganizationQuery }>('/organizations', { schema: listOrganizationsSchema }, async (request) => {
      const { user } = await sessions.requireVerifiedSession(sessionToken(request))
      return apiResponse(await service.list(user.id, request.query))
    })
    app.get<{ Params: OrganizationParams }>('/organizations/:id', { schema: detailOrganizationSchema }, async (request) => {
      const { user } = await sessions.requireVerifiedSession(sessionToken(request))
      return apiResponse(await service.detail(user.id, request.params.id))
    })
    app.post<{ Body: CreateOrganization }>('/organizations', { schema: createOrganizationSchema, bodyLimit: 8192 }, async (request, reply) => {
      const { user } = await sessions.requireVerifiedSession(sessionToken(request))
      return reply.code(201).send(apiResponse(await service.create(user.id, request.body)))
    })
    app.patch<{ Params: OrganizationParams; Body: UpdateOrganization }>('/organizations/:id',
      { schema: updateOrganizationSchema, bodyLimit: 8192 }, async (request) => {
        const { user } = await sessions.requireVerifiedSession(sessionToken(request))
        return apiResponse(await service.update(user.id, request.params.id, request.body))
      })
    app.post<{ Params: OrganizationParams; Body: OrganizationDecision }>('/organizations/:id/decision',
      { schema: decideOrganizationSchema, bodyLimit: 8192 }, async (request) => {
        const { user } = await sessions.requireVerifiedSession(sessionToken(request))
        return apiResponse(await service.decide(user.id, request.params.id, request.body))
      })
  }
}
