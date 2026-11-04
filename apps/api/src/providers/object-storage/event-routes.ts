import type { FastifyPluginAsync } from 'fastify'
import { Value } from '@sinclair/typebox/value'
import { apiResponse } from '@refs-tools/contracts'
import { MediaProviderEventSchema, type MediaProviderEvent } from '@refs-tools/contracts/media'
import { DomainError } from '../../application/errors.js'
import type { MediaCompletionService } from '../../modules/media/media-completion.service.js'
import { verifyStorageEvent } from './events.js'

export type StorageEventDependencies = { service: MediaCompletionService; secret: string; now: () => Date }

/** 事件桥端点独立于 Cookie/Origin 门禁；验签后才解析 JSON 并进入媒体 Service。 */
export function storageEventRoutes(dependencies: StorageEventDependencies): FastifyPluginAsync {
  return async (app) => {
    app.addHook('onRequest', async (_request, reply) => { reply.header('cache-control', 'no-store') })
    app.removeContentTypeParser('application/json')
    app.addContentTypeParser('application/json', { parseAs: 'string', bodyLimit: 4096 }, (_request, body, done) => done(null, body))
    app.post<{ Body: string }>('/oss', { bodyLimit: 4096 }, async (request) => {
      verifyStorageEvent(request.body, request.headers['x-refs-timestamp'] as string | undefined,
        request.headers['x-refs-signature'] as string | undefined, dependencies.secret, dependencies.now())
      const event = parseEvent(request.body)
      return apiResponse(await dependencies.service.providerEvent(event))
    })
  }
}

function parseEvent(body: string): MediaProviderEvent {
  let event: unknown
  try { event = JSON.parse(body) } catch { throw new DomainError('INVALID_REQUEST', '事件格式错误', 400) }
  if (!Value.Check(MediaProviderEventSchema, event)) throw new DomainError('INVALID_REQUEST', '事件格式错误', 400)
  return event
}
