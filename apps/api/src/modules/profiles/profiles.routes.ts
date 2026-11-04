import type { FastifyPluginAsync } from 'fastify'
import { apiResponse } from '@refs-tools/contracts'
import type { UpdateProfileBody } from '@refs-tools/contracts/profile'
import { requireSameOrigin, sessionToken } from '../auth/auth.http.js'
import type { SessionService } from '../auth/session.service.js'
import type { ProfilesService } from './profiles.service.js'
import { getProfileSchema, updateProfileSchema } from './profiles.schema.js'

export type ProfilesRouteDependencies = {
  service: ProfilesService; sessions: Pick<SessionService, 'requireSession'>; publicOrigin: string
}

/** 本人档案端点只接受 Cookie 会话身份；不接受客户端传入的 userId。 */
export function profilesRoutes({ service, sessions, publicOrigin }: ProfilesRouteDependencies): FastifyPluginAsync {
  return async (app) => {
    app.addHook('onRequest', async (request, reply) => {
      reply.header('cache-control', 'no-store').header('vary', 'Cookie')
      requireSameOrigin(request, publicOrigin)
    })
    app.get('/profile', { schema: getProfileSchema }, async (request) => {
      const { user } = await sessions.requireSession(sessionToken(request))
      return apiResponse(await service.get(user.id))
    })
    app.patch<{ Body: UpdateProfileBody }>('/profile', { schema: updateProfileSchema, bodyLimit: 8192 }, async (request) => {
      const { user } = await sessions.requireSession(sessionToken(request))
      return apiResponse(await service.update(user.id, request.body))
    })
  }
}
