import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify'
import { ApiError, apiError, apiResponse } from '@refs-tools/contracts'

type AppOptions = FastifyServerOptions

/**
 * 装配可独立测试的 API 实例，监听端口留给 server 入口（ADR 0004）。
 * @returns 已完成插件就绪的实例；调用方负责 listen 或 inject，并在结束时 close。
 */
export async function buildApp(options: AppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify(options)

  app.get('/api/v1/health', async () => apiResponse({ status: 'ok' }))

  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send(apiError('NOT_FOUND', '请求的资源不存在', request.id))
  })

  app.setErrorHandler((error, request, reply) => {
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
    request.log.error(error)
    reply.code(500).send(apiError('INTERNAL_ERROR', '服务器内部错误', request.id))
  })

  await app.ready()
  return app
}
