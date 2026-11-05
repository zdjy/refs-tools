import type { FastifyPluginAsync } from 'fastify'
import { apiResponse } from '@refs-tools/contracts'
import type { CreateInvitation, MemberChange, MemberListQuery, MemberOrganizationParams, MemberPageQuery, MemberRecordParams, MembershipDecision } from '@refs-tools/contracts/organization-members'
import { requireSameOrigin, sessionToken } from '../auth/auth.http.js'
import type { SessionService } from '../auth/session.service.js'
import type { OrganizationMembersService } from './organization-members.service.js'
import type { OrganizationInvitationsService } from './organization-invitations.service.js'
import * as schemas from './organization-members.schema.js'

export type MemberRouteDependencies = { members: OrganizationMembersService; invitations: OrganizationInvitationsService;
  sessions: Pick<SessionService, 'requireVerifiedSession'>; publicOrigin: string }

/** Cookie 主体由服务端会话获取，不接收客户端操作者或组织角色声明。 */
export function organizationMembersRoutes({ members, invitations, sessions, publicOrigin }: MemberRouteDependencies): FastifyPluginAsync {
  return async app => {
    app.addHook('onRequest', async (request, reply) => {
      reply.header('cache-control', 'no-store').header('vary', 'Cookie')
      requireSameOrigin(request, publicOrigin)
    })
    app.get<{ Params: MemberOrganizationParams; Querystring: MemberListQuery }>('/organizations/:id/memberships', { schema: schemas.memberListSchema }, async request => {
      const { user } = await sessions.requireVerifiedSession(sessionToken(request))
      return apiResponse(await members.list(user.id, request.params.id, request.query))
    })
    app.get<{ Params: MemberOrganizationParams; Querystring: MemberPageQuery }>('/organizations/:id/invitations', { schema: schemas.invitationListSchema }, async request => {
      const { user } = await sessions.requireVerifiedSession(sessionToken(request))
      return apiResponse(await invitations.list(user.id, request.params.id, request.query))
    })
    app.get<{ Querystring: MemberPageQuery }>('/me/organization-invitations', { schema: schemas.invitationInboxSchema }, async request => {
      const { user } = await sessions.requireVerifiedSession(sessionToken(request))
      return apiResponse(await invitations.inbox(user.id, request.query))
    })
    app.post<{ Params: MemberOrganizationParams; Body: CreateInvitation }>('/organizations/:id/invitations', { schema: schemas.invitationCreateSchema, bodyLimit: 2048 }, async (request, reply) => {
      const { user } = await sessions.requireVerifiedSession(sessionToken(request))
      return reply.code(201).send(apiResponse(await invitations.create(user.id, request.params.id, request.body)))
    })
    app.post<{ Params: MemberRecordParams; Body: MemberChange }>('/organizations/:id/invitations/:recordId/revoke', { schema: schemas.invitationRevokeSchema, bodyLimit: 4096 }, async request => {
      const { user } = await sessions.requireVerifiedSession(sessionToken(request))
      return apiResponse(await invitations.revoke(user.id, request.params.id, request.params.recordId, request.body))
    })
    app.post<{ Params: MemberRecordParams }>('/organizations/:id/invitations/:recordId/accept', { schema: schemas.invitationAcceptSchema }, async request => {
      const { user } = await sessions.requireVerifiedSession(sessionToken(request))
      return apiResponse(await invitations.accept(user.id, request.params.id, request.params.recordId))
    })
    app.post<{ Params: MemberRecordParams }>('/organizations/:id/invitations/:recordId/decline', { schema: schemas.invitationRespondSchema }, async request => {
      const { user } = await sessions.requireVerifiedSession(sessionToken(request))
      return apiResponse(await invitations.respond(user.id, request.params.id, request.params.recordId, 'declined'))
    })
    app.post<{ Params: MemberOrganizationParams }>('/organizations/:id/membership-requests', { schema: schemas.memberRequestSchema, bodyLimit: 1024 }, async request => {
      const { user } = await sessions.requireVerifiedSession(sessionToken(request))
      return apiResponse(await members.request(user.id, request.params.id))
    })
    app.post<{ Params: MemberRecordParams; Body: MembershipDecision }>('/organizations/:id/memberships/:recordId/decision', { schema: schemas.memberDecisionSchema, bodyLimit: 4096 }, async request => {
      const { user } = await sessions.requireVerifiedSession(sessionToken(request))
      return apiResponse(await members.decide(user.id, request.params.id, request.params.recordId, request.body))
    })
    app.post<{ Params: MemberRecordParams; Body: MemberChange }>('/organizations/:id/memberships/:recordId/leave', { schema: schemas.memberLeaveSchema, bodyLimit: 4096 }, async request => {
      const { user } = await sessions.requireVerifiedSession(sessionToken(request))
      return apiResponse(await members.leave(user.id, request.params.id, request.params.recordId, request.body))
    })
  }
}
