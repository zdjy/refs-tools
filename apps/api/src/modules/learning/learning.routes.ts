import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { apiResponse } from '@refs-tools/contracts'
import type { LearningContent, LearningRevisionInput, LearningCategoryInput, LearningCategoryUpdate, LearningExpected,
  LearningPublish, LearningId, LearningVersionParams, LearningMediaParams, LearningReadQuery, LearningQuery } from '@refs-tools/contracts/learning'
import type { PageQuery } from '@refs-tools/contracts/pagination'
import { requireSameOrigin, sessionToken } from '../auth/auth.http.js'
import type { SessionService } from '../auth/session.service.js'
import type { LearningService } from './learning.service.js'
import type { LearningCategoriesService } from './learning-categories.service.js'
import type { LearningPublishingService } from './learning-publishing.service.js'
import type { LearningMediaService } from './learning-media.service.js'
import * as s from './learning.schema.js'

export type LearningRouteDependencies = { service: LearningService; categories: LearningCategoriesService; publishing: LearningPublishingService;
  media: LearningMediaService; sessions: Pick<SessionService, 'requireSession'>; publicOrigin: string }
type Id = { Params: LearningId }

/** 学习目录与正文允许未验证邮箱登录者；业务层独立执行写门禁与平台权限检查。 */
export function learningRoutes(d: LearningRouteDependencies): FastifyPluginAsync {
  const actor = async (request: FastifyRequest) => (await d.sessions.requireSession(sessionToken(request))).user.id
  return async app => {
    app.addHook('onRequest', async (request, reply) => {
      reply.header('cache-control', 'no-store').header('vary', 'Cookie')
      requireSameOrigin(request, d.publicOrigin)
    })
    app.get<{ Querystring: PageQuery }>('/learning/categories', { schema: s.categories },
      async request => apiResponse(await d.categories.list(await actor(request), request.query)))
    app.get<{ Querystring: PageQuery }>('/admin/learning/categories', { schema: s.categories },
      async request => apiResponse(await d.categories.list(await actor(request), request.query, true)))
    app.post<{ Body: LearningCategoryInput; Headers: { 'idempotency-key': string } }>('/admin/learning/categories', { schema: s.categoryCreate, bodyLimit: 2048 },
      async (request, reply) => reply.code(201).send(apiResponse(await d.categories.create(await actor(request), request.body, request.headers['idempotency-key']))))
    app.patch<Id & { Body: LearningCategoryUpdate }>('/admin/learning/categories/:id', { schema: s.categoryUpdate, bodyLimit: 2048 },
      async request => apiResponse(await d.categories.update(await actor(request), request.params.id, request.body)))
    app.get<{ Querystring: LearningQuery }>('/learning/assets', { schema: s.list },
      async request => apiResponse(await d.service.list(await actor(request), request.query)))
    app.get<{ Querystring: LearningQuery }>('/admin/learning/assets', { schema: s.list },
      async request => apiResponse(await d.service.list(await actor(request), request.query, true)))
    app.get<Id>('/learning/assets/:id', { schema: s.detail },
      async request => apiResponse(await d.service.detail(await actor(request), request.params.id)))
    app.get<Id>('/admin/learning/assets/:id', { schema: s.detail },
      async request => apiResponse(await d.service.detail(await actor(request), request.params.id, true)))
    app.post<{ Body: LearningContent; Headers: { 'idempotency-key': string } }>('/admin/learning/assets', { schema: s.create, bodyLimit: 1048576 },
      async (request, reply) => reply.code(201).send(apiResponse(await d.service.create(await actor(request), request.body, request.headers['idempotency-key']))))
    app.post<Id & { Body: LearningRevisionInput }>('/admin/learning/assets/:id/versions', { schema: s.revise, bodyLimit: 1048576 },
      async request => apiResponse(await d.service.revise(await actor(request), request.params.id, request.body)))
    app.post<Id & { Body: LearningPublish }>('/admin/learning/assets/:id/publish', { schema: s.publish, bodyLimit: 1024 },
      async request => apiResponse(await d.publishing.publish(await actor(request), request.params.id, request.body.expectedRevision, request.body.version)))
    app.post<Id & { Body: LearningExpected }>('/admin/learning/assets/:id/unpublish', { schema: s.unpublish, bodyLimit: 1024 },
      async request => apiResponse(await d.publishing.unpublish(await actor(request), request.params.id, request.body.expectedRevision)))
    app.get<Id & { Querystring: PageQuery }>('/admin/learning/assets/:id/versions', { schema: s.history },
      async request => apiResponse(await d.service.history(await actor(request), request.params.id, request.query)))
    app.get<{ Params: LearningVersionParams }>('/admin/learning/assets/:id/versions/:version', { schema: s.snapshot },
      async request => apiResponse(await d.service.snapshot(await actor(request), request.params.id, Number(request.params.version))))
    app.get<{ Params: LearningMediaParams; Querystring: LearningReadQuery }>('/learning/assets/:id/media/:mediaId/read-url', { schema: s.read },
      async request => apiResponse(await d.media.read(await actor(request), request.params.id, request.params.mediaId, request.query.mode)))
  }
}
