import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify'
import { ApiError, apiError, apiResponse } from '@refs-tools/contracts'

type AppOptions = FastifyServerOptions

export async function buildApp(options: AppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify(options)

  app.get('/api/v1/health', async () => apiResponse({ status: 'ok' }))

  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send(apiError('NOT_FOUND', '请求的资源不存在', request.id))
  })

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ApiError) {
      reply.code(error.statusCode).send(apiError(
        error.code,
        error.message,
        request.id,
        error.details,
      ))
      return
    }

    request.log.error(error)
    reply.code(500).send(apiError('INTERNAL_ERROR', '服务器内部错误', request.id))
  })

  await app.ready()
  return app
}
