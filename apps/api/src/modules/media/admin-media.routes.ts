import type { FastifyPluginAsync } from 'fastify'
import { apiResponse } from '@refs-tools/contracts'
import type { AdminMediaOperation, AdminMediaQuery } from '@refs-tools/contracts/admin-media'
import { requireSameOrigin, sessionToken } from '../auth/auth.http.js'
import type { SessionService } from '../auth/session.service.js'
import type { AdminMediaService } from './admin-media.service.js'
import { deleteAdminMediaSchema, detailAdminMediaSchema, listAdminMediaSchema, readAdminMediaSchema } from './admin-media.schema.js'

export type AdminMediaRouteDependencies = {
  service: AdminMediaService; sessions: Pick<SessionService, 'requireVerifiedSession'>; publicOrigin: string
}
type Params = { mediaId: string }

/** 治理入口仅接收小 JSON；Cookie、同源与 no-store 对错误响应同样生效。 */
export function adminMediaRoutes({ service, sessions, publicOrigin }: AdminMediaRouteDependencies): FastifyPluginAsync {
  return async app => {
    app.addHook('onRequest', async (request, reply) => {
      reply.header('cache-control', 'no-store').header('vary', 'Cookie')
      requireSameOrigin(request, publicOrigin)
    })
    const actor = async (request: Parameters<typeof sessionToken>[0]) => (await sessions.requireVerifiedSession(sessionToken(request))).user.id
    app.get<{ Querystring: AdminMediaQuery }>('/media', { schema: listAdminMediaSchema }, async request => {
      return apiResponse(await service.list(await actor(request), request.query))
    })
    app.get<{ Params: Params }>('/media/:mediaId', { schema: detailAdminMediaSchema }, async request => {
      return apiResponse(await service.detail(await actor(request), request.params.mediaId))
    })
    app.post<{ Params: Params; Body: AdminMediaOperation }>('/media/:mediaId/read-url', { schema: readAdminMediaSchema, bodyLimit: 4096 }, async request => {
      return apiResponse(await service.read(await actor(request), request.params.mediaId, request.body))
    })
    app.delete<{ Params: Params; Body: AdminMediaOperation }>('/media/:mediaId', { schema: deleteAdminMediaSchema, bodyLimit: 4096 }, async request => {
      return apiResponse(await service.remove(await actor(request), request.params.mediaId, request.body))
    })
  }
}
