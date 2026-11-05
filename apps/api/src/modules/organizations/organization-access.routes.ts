import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { apiResponse } from '@refs-tools/contracts'
import type { CandidateQuery, CreateJoinCode, GrantRole, JoinCodeParams, RedeemJoinCode, RevokeJoinCode, RoleParams } from '@refs-tools/contracts/organization-access'
import type { MemberOrganizationParams } from '@refs-tools/contracts/organization-members'
import type { DirectoryQuery, OrganizationApplication } from '@refs-tools/contracts/organization-self'
import { requireSameOrigin, sessionToken } from '../auth/auth.http.js'
import type { SessionService } from '../auth/session.service.js'
import type { OrganizationCandidatesService } from './organization-candidates.service.js'
import type { OrganizationJoinCodesService } from './organization-join-codes.service.js'
import type { OrganizationRolesService } from './organization-roles.service.js'
import type { OrganizationSelfService } from './organization-self.service.js'
import * as schemas from './organization-access.schema.js'

export type AccessRouteDependencies = {
  self: OrganizationSelfService; joinCodes: OrganizationJoinCodesService; roles: OrganizationRolesService
  candidates: OrganizationCandidatesService; sessions: Pick<SessionService, 'requireVerifiedSession'>; publicOrigin: string
}
type Org = { Params: MemberOrganizationParams }

/** 用户视角的组织接口：主体只来自 Cookie 会话，成员码明文绝不进入日志或缓存。 */
export function organizationAccessRoutes(d: AccessRouteDependencies): FastifyPluginAsync {
  const actor = async (request: FastifyRequest) => (await d.sessions.requireVerifiedSession(sessionToken(request))).user.id
  return async app => {
    app.addHook('onRequest', async (request, reply) => {
      reply.header('cache-control', 'no-store').header('vary', 'Cookie')
      requireSameOrigin(request, d.publicOrigin)
    })
    app.get('/me/organizations', { schema: schemas.mineSchema }, async request => apiResponse(await d.self.mine(await actor(request))))
    app.get<{ Querystring: DirectoryQuery }>('/organization-directory', { schema: schemas.directorySchema },
      async request => apiResponse(await d.self.directory(await actor(request), request.query)))
    app.post<{ Body: OrganizationApplication }>('/me/organization-applications', { schema: schemas.applySchema, bodyLimit: 4096 },
      async (request, reply) => reply.code(201).send(apiResponse(await d.self.apply(await actor(request), request.body))))
    app.post<{ Body: RedeemJoinCode }>('/organization-join-codes/redeem', { schema: schemas.redeemSchema, bodyLimit: 1024 },
      async request => apiResponse(await d.joinCodes.redeem(await actor(request), request.body.token)))
    app.get<Org>('/organizations/:id/join-codes', { schema: schemas.joinCodeListSchema },
      async request => apiResponse(await d.joinCodes.list(await actor(request), request.params.id)))
    app.post<Org & { Body: CreateJoinCode }>('/organizations/:id/join-codes', { schema: schemas.joinCodeCreateSchema, bodyLimit: 1024 },
      async (request, reply) => reply.code(201).send(apiResponse(await d.joinCodes.create(await actor(request), request.params.id, request.body))))
    app.post<{ Params: JoinCodeParams; Body: RevokeJoinCode }>('/organizations/:id/join-codes/:codeId/revoke', { schema: schemas.joinCodeRevokeSchema, bodyLimit: 1024 },
      async request => apiResponse(await d.joinCodes.revoke(await actor(request), request.params.id, request.params.codeId, request.body)))
    app.get<Org>('/organizations/:id/roles', { schema: schemas.roleListSchema },
      async request => apiResponse(await d.roles.list(await actor(request), request.params.id)))
    app.post<Org & { Body: GrantRole }>('/organizations/:id/roles', { schema: schemas.roleGrantSchema, bodyLimit: 1024 },
      async (request, reply) => reply.code(201).send(apiResponse(await d.roles.grant(await actor(request), request.params.id, request.body))))
    app.post<{ Params: RoleParams }>('/organizations/:id/roles/:bindingId/revoke', { schema: schemas.roleRevokeSchema, bodyLimit: 256 },
      async request => apiResponse(await d.roles.revoke(await actor(request), request.params.id, request.params.bindingId)))
    app.get<Org & { Querystring: CandidateQuery }>('/organizations/:id/member-candidates', { schema: schemas.candidateSchema },
      async request => apiResponse(await d.candidates.search(await actor(request), request.params.id, request.query)))
  }
}
