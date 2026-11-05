import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { apiResponse } from '@refs-tools/contracts'
import type { CreateOwnershipTransfer, DecideOwnershipTransfer, OwnershipTransferParams, PlatformOwnershipTransfer } from '@refs-tools/contracts/organization-ownership'
import type { MemberOrganizationParams } from '@refs-tools/contracts/organization-members'
import type { OrganizationParams } from '@refs-tools/contracts/organizations'
import type { PageQuery } from '@refs-tools/contracts/pagination'
import { requireSameOrigin, sessionToken } from '../auth/auth.http.js'
import type { SessionService } from '../auth/session.service.js'
import type { OrganizationOwnershipService } from './organization-ownership.service.js'
import * as schemas from './organization-ownership.schema.js'

export type OwnershipRouteDependencies = {
  service: OrganizationOwnershipService; sessions: Pick<SessionService, 'requireVerifiedSession'>; publicOrigin: string
}
type Decide = { Params: OwnershipTransferParams; Body: DecideOwnershipTransfer }

/** 所有权移交接口：主体只来自 Cookie 会话；负责人路径需接收人接受，平台路径直接生效并强制理由。 */
export function organizationOwnershipRoutes(d: OwnershipRouteDependencies): FastifyPluginAsync {
  const actor = async (request: FastifyRequest) => (await d.sessions.requireVerifiedSession(sessionToken(request))).user.id
  const base = '/organizations/:id/ownership-transfers'
  return async app => {
    app.addHook('onRequest', async (request, reply) => {
      reply.header('cache-control', 'no-store').header('vary', 'Cookie')
      requireSameOrigin(request, d.publicOrigin)
    })
    app.get<{ Querystring: PageQuery }>('/me/ownership-transfers', { schema: schemas.incomingTransferSchema },
      async request => apiResponse(await d.service.incoming(await actor(request), request.query)))
    app.get<{ Params: MemberOrganizationParams; Querystring: PageQuery }>(base, { schema: schemas.transferListSchema },
      async request => apiResponse(await d.service.list(await actor(request), request.params.id, request.query)))
    app.post<{ Params: MemberOrganizationParams; Body: CreateOwnershipTransfer }>(base, { schema: schemas.transferCreateSchema, bodyLimit: 1024 },
      async (request, reply) => reply.code(201).send(apiResponse(await d.service.create(await actor(request), request.params.id, request.body))))
    app.post<Decide>(`${base}/:transferId/accept`, { schema: schemas.transferAcceptSchema, bodyLimit: 1024 },
      async request => apiResponse(await d.service.accept(await actor(request), request.params.id, request.params.transferId, request.body)))
    app.post<Decide>(`${base}/:transferId/decline`, { schema: schemas.transferDeclineSchema, bodyLimit: 1024 },
      async request => apiResponse(await d.service.decline(await actor(request), request.params.id, request.params.transferId, request.body)))
    app.post<Decide>(`${base}/:transferId/cancel`, { schema: schemas.transferCancelSchema, bodyLimit: 1024 },
      async request => apiResponse(await d.service.cancel(await actor(request), request.params.id, request.params.transferId, request.body)))
    app.post<{ Params: OrganizationParams; Body: PlatformOwnershipTransfer }>('/admin/organizations/:id/ownership',
      { schema: schemas.platformTransferSchema, bodyLimit: 2048 },
      async request => apiResponse(await d.service.platformTransfer(await actor(request), request.params.id, request.body)))
  }
}
