import type { FastifyPluginAsync } from 'fastify'
import { apiResponse } from '@refs-tools/contracts'
import type { AdminUserParams, AdminUserQuery, CreateAdminUser, DeleteAdminUser, UpdateAdminUser } from '@refs-tools/contracts/admin-users'
import { AuthSessionResponseSchema } from '@refs-tools/contracts/auth'
import type { SessionService } from './session.service.js'
import type { AdminUsersService } from './admin-users.service.js'
import { requireSameOrigin, sessionToken } from './auth.http.js'
import { createUserSchema, deleteUserSchema, detailUserSchema, listUsersSchema, updateUserSchema } from './admin-users.schema.js'

export type AdminUsersRouteDependencies = {
  service: AdminUsersService; sessions: Pick<SessionService, 'requireVerifiedSession'>; publicOrigin: string
}

/** 管理端复用规范 Cookie 与 Origin 门禁，演示 token 无法获得任何账号权限。 */
export function adminUsersRoutes({ service, sessions, publicOrigin }: AdminUsersRouteDependencies): FastifyPluginAsync {
  return async (app) => {
    app.addHook('onRequest', async (request, reply) => {
      reply.header('cache-control', 'no-store').header('vary', 'Cookie')
      requireSameOrigin(request, publicOrigin)
    })
    app.get('/session', { schema: { response: { 200: AuthSessionResponseSchema } } }, async (request) => {
      const session = await sessions.requireVerifiedSession(sessionToken(request))
      await service.checkAccess(session.user.id)
      return apiResponse(session)
    })
    app.get<{ Querystring: AdminUserQuery }>('/users', { schema: listUsersSchema }, async (request) => {
      const { user } = await sessions.requireVerifiedSession(sessionToken(request))
      return apiResponse(await service.list(user.id, request.query))
    })
    app.get<{ Params: AdminUserParams }>('/users/:id', { schema: detailUserSchema }, async (request) => {
      const { user } = await sessions.requireVerifiedSession(sessionToken(request))
      return apiResponse(await service.detail(user.id, request.params.id))
    })
    app.post<{ Body: CreateAdminUser }>('/users', { schema: createUserSchema, bodyLimit: 8192 }, async (request, reply) => {
      const { user } = await sessions.requireVerifiedSession(sessionToken(request))
      return reply.code(201).send(apiResponse(await service.create(user.id, request.body)))
    })
    app.patch<{ Params: AdminUserParams; Body: UpdateAdminUser }>('/users/:id', { schema: updateUserSchema, bodyLimit: 8192 }, async (request) => {
      const { user } = await sessions.requireVerifiedSession(sessionToken(request))
      return apiResponse(await service.update(user.id, request.params.id, request.body))
    })
    app.delete<{ Params: AdminUserParams; Body: DeleteAdminUser }>('/users/:id', { schema: deleteUserSchema, bodyLimit: 8192 }, async (request) => {
      const { user } = await sessions.requireVerifiedSession(sessionToken(request))
      return apiResponse(await service.remove(user.id, request.params.id, request.body.version))
    })
  }
}
