import Fastify, { LogController, type FastifyInstance, type FastifyServerOptions } from 'fastify'
import { ApiError, apiError, apiResponse } from '@refs-tools/contracts'

import { DomainError } from './application/errors.js'
import { authRoutes, type AuthRouteDependencies } from './modules/auth/auth.routes.js'
import { auditRoutes, type AuditRouteDependencies } from './modules/audit/audit.routes.js'
import { adminUsersRoutes, type AdminUsersRouteDependencies } from './modules/auth/admin-users.routes.js'
import { organizationsRoutes, type OrganizationsRouteDependencies } from './modules/organizations/organizations.routes.js'
import { mediaRoutes, type MediaRouteDependencies } from './modules/media/media.routes.js'
import { storageEventRoutes, type StorageEventDependencies } from './providers/object-storage/event-routes.js'

type AppOptions = FastifyServerOptions
type AppDependencies = { auth?: AuthRouteDependencies; audit?: AuditRouteDependencies; adminUsers?: AdminUsersRouteDependencies; media?: MediaRouteDependencies;
  organizations?: OrganizationsRouteDependencies; storageEvents?: StorageEventDependencies; close?: () => Promise<void> }

class SafeLogController extends LogController {
  constructor() { super({ disableRequestLogging: true }) }
}

/**
 * 装配可独立测试的 API 实例，监听端口留给 server 入口（ADR 0004）。
 * @returns 已完成插件就绪的实例；调用方负责 listen 或 inject，并在结束时 close。
 */
export async function buildApp(options: AppOptions = {}, dependencies: AppDependencies = {}): Promise<FastifyInstance> {
  const app = Fastify({
    ...options,
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false } },
    logController: new SafeLogController(),
  })

  app.get('/api/v1/health', async () => apiResponse({ status: 'ok' }))

  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send(apiError('NOT_FOUND', '请求的资源不存在', request.id))
  })

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof DomainError) {
      reply.code(error.statusCode).send(apiError(error.code, error.message, request.id))
      return
    }
    const httpError = error as { validation?: unknown; statusCode?: number }
    if (httpError.validation || [400, 413, 415].includes(httpError.statusCode ?? 0)) {
      const status = httpError.statusCode === 413 ? 413 : httpError.statusCode === 415 ? 415 : 400
      reply.code(status).send(apiError('INVALID_REQUEST', '请求格式不符合要求', request.id))
      return
    }
    if (error instanceof ApiError) {
      // 错误体以本次请求 ID 为准，避免转抛的错误携带其他请求的追踪标识。
      reply.code(error.statusCode).send(apiError(
        error.code,
        error.message,
        request.id,
        error.details,
      ))
      return
    }

    // 未明确声明可公开的异常只返回通用信息，不将堆栈或底层错误信息泄露给客户端。
    request.log.error({ requestId: request.id }, '请求处理失败')
    reply.code(500).send(apiError('INTERNAL_ERROR', '服务器内部错误', request.id))
  })

  if (dependencies.close) app.addHook('onClose', dependencies.close)
  if (dependencies.auth) await app.register(authRoutes(dependencies.auth), { prefix: '/api/v1/auth' })
  if (dependencies.audit) await app.register(auditRoutes(dependencies.audit), { prefix: '/api/v1' })
  if (dependencies.adminUsers) await app.register(adminUsersRoutes(dependencies.adminUsers), { prefix: '/api/v1/admin' })

  if (dependencies.organizations) await app.register(organizationsRoutes(dependencies.organizations), { prefix: '/api/v1/admin' })
  if (dependencies.media) await app.register(mediaRoutes(dependencies.media), { prefix: '/api/v1/media' })
  if (dependencies.storageEvents) await app.register(storageEventRoutes(dependencies.storageEvents), { prefix: '/api/v1/media/provider-events' })

  await app.ready()
  return app
}
