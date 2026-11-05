import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { apiResponse } from '@refs-tools/contracts'
import type { CreatePlatformInvite, PlatformInviteParams, PlatformInviteQuery, RevokePlatformInvite } from '@refs-tools/contracts/platform-invites'
import { requireSameOrigin, sessionToken } from '../auth/auth.http.js'
import type { SessionService } from '../auth/session.service.js'
import type { PlatformInvitesService } from './organization-platform-invites.service.js'
import * as schemas from './organization-platform-invites.schema.js'

export type PlatformInviteRouteDependencies = {
  service: PlatformInvitesService; sessions: Pick<SessionService, 'requireVerifiedSession'>; publicOrigin: string
}

/** 平台管理端邀请码接口：授权在 Service 内实时判定，明文令牌绝不进入日志或缓存。 */
export function platformInviteRoutes(d: PlatformInviteRouteDependencies): FastifyPluginAsync {
  const actor = async (request: FastifyRequest) => (await d.sessions.requireVerifiedSession(sessionToken(request))).user.id
  return async app => {
    app.addHook('onRequest', async (request, reply) => {
      reply.header('cache-control', 'no-store').header('vary', 'Cookie')
      requireSameOrigin(request, d.publicOrigin)
    })
    app.get<{ Querystring: PlatformInviteQuery }>('/admin/organization-invites', { schema: schemas.platformInviteListSchema },
      async request => apiResponse(await d.service.list(await actor(request), request.query)))
    app.post<{ Body: CreatePlatformInvite }>('/admin/organization-invites', { schema: schemas.platformInviteCreateSchema, bodyLimit: 1024 },
      async (request, reply) => reply.code(201).send(apiResponse(await d.service.create(await actor(request), request.body))))
    app.post<{ Params: PlatformInviteParams; Body: RevokePlatformInvite }>('/admin/organization-invites/:inviteId/revoke',
      { schema: schemas.platformInviteRevokeSchema, bodyLimit: 1024 },
      async request => apiResponse(await d.service.revoke(await actor(request), request.params.inviteId, request.body)))
  }
}
