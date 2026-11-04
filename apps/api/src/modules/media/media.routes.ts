import type { FastifyPluginAsync } from 'fastify'
import { apiResponse } from '@refs-tools/contracts'
import type { MediaCompletionBody, UploadIntentBody } from '@refs-tools/contracts/media'
import { requireSameOrigin, sessionToken } from '../auth/auth.http.js'
import type { SessionService } from '../auth/session.service.js'
import type { MediaCompletionService } from './media-completion.service.js'
import { completeMediaSchema, createUploadSchema, deleteMediaSchema, readMediaSchema, renewUploadSchema } from './media.schema.js'

export type MediaRouteDependencies = {
  service: MediaCompletionService; sessions: Pick<SessionService, 'requireSession'>; publicOrigin: string
}
type Params = { mediaId: string }

/** 小 JSON 控制面，拒绝 multipart/文件内容；包括错误响应在内均禁止缓存。 */
export function mediaRoutes(dependencies: MediaRouteDependencies): FastifyPluginAsync {
  return async (app) => {
    app.addHook('onRequest', async (request, reply) => {
      reply.header('cache-control', 'no-store').header('vary', 'Cookie')
      requireSameOrigin(request, dependencies.publicOrigin)
    })
    const actor = async (request: Parameters<typeof sessionToken>[0]) => (await dependencies.sessions.requireSession(sessionToken(request))).user.id
    app.post<{ Body: UploadIntentBody; Headers: { 'idempotency-key': string } }>('/upload-intents',
      { bodyLimit: 4096, schema: createUploadSchema }, async (request, reply) => {
        const result = await dependencies.service.create(await actor(request), request.body, request.headers['idempotency-key'])
        return reply.code(201).send(apiResponse(result))
      })
    app.post<{ Params: Params }>('/:mediaId/upload-authorization', { bodyLimit: 1024, schema: renewUploadSchema }, async (request) => {
      return apiResponse(await dependencies.service.renew(await actor(request), request.params.mediaId))
    })
    app.post<{ Params: Params; Body: MediaCompletionBody }>('/:mediaId/complete', { bodyLimit: 1024, schema: completeMediaSchema }, async (request) => {
      return apiResponse(await dependencies.service.complete(await actor(request), request.params.mediaId))
    })
    app.get<{ Params: Params }>('/:mediaId/read-url', { schema: readMediaSchema }, async (request) => {
      return apiResponse(await dependencies.service.read(await actor(request), request.params.mediaId))
    })
    app.delete<{ Params: Params }>('/:mediaId', { bodyLimit: 1024, schema: deleteMediaSchema }, async (request) => {
      return apiResponse(await dependencies.service.remove(await actor(request), request.params.mediaId))
    })
  }
}
