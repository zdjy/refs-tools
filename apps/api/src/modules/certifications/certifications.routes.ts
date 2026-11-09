import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { apiResponse } from '@refs-tools/contracts'
import type { CertificationParams, CertificationQueueParams, OrganizationCertificationParams, CertificationAppealParams,
  CertificationEvidenceParams, CertificationAppealEvidenceParams, CreateCertification, UpdateCertification,
  CertificationVersion, RevokeCertification, CertificationDecision, CreateCertificationAppeal, CertificationAppealDecision } from '@refs-tools/contracts/certifications'
import type { PageQuery } from '@refs-tools/contracts/pagination'
import { requireSameOrigin, sessionToken } from '../auth/auth.http.js'
import type { SessionService } from '../auth/session.service.js'
import type { CertificationsService } from './certifications.service.js'
import type { CertificationReviewService } from './certification-review.service.js'
import type { CertificationAppealsService } from './certification-appeals.service.js'
import type { CertificationEvidenceService } from './certification-evidence.service.js'
import * as s from './certifications.schema.js'

export type CertificationRouteDependencies = {
  service: CertificationsService; review: CertificationReviewService; appeals: CertificationAppealsService; evidence: CertificationEvidenceService
  sessions: Pick<SessionService, 'requireVerifiedSession'>; publicOrigin: string
}
type Id = { Params: CertificationParams }
type Page = { Querystring: PageQuery }

/** 私有档案控制面仅接收有界 JSON，主体只来自已验证 Cookie，会话与错误响应均禁止缓存。 */
export function certificationsRoutes(d: CertificationRouteDependencies): FastifyPluginAsync {
  const actor = async (request: FastifyRequest) => (await d.sessions.requireVerifiedSession(sessionToken(request))).user.id
  return async app => {
    app.addHook('onRequest', async (request, reply) => {
      reply.header('cache-control', 'no-store').header('vary', 'Cookie')
      requireSameOrigin(request, d.publicOrigin)
    })
    app.post<{ Body: CreateCertification; Headers: { 'idempotency-key': string } }>('/certifications',
      { schema: s.createSchema, bodyLimit: 16384 }, async (request, reply) => reply.code(201).send(apiResponse(
        await d.service.create(await actor(request), request.body, request.headers['idempotency-key']))))
    app.get<Page>('/me/certifications', { schema: s.mineSchema },
      async request => apiResponse(await d.service.mine(await actor(request), request.query)))
    app.get<Id>('/certifications/:id', { schema: s.detailSchema },
      async request => apiResponse(await d.service.detail(await actor(request), request.params.id)))
    app.get<Id & Page>('/certifications/:id/history', { schema: s.historySchema },
      async request => apiResponse(await d.service.history(await actor(request), request.params.id, request.query)))
    app.patch<Id & { Body: UpdateCertification }>('/certifications/:id', { schema: s.updateSchema, bodyLimit: 16384 },
      async request => apiResponse(await d.service.update(await actor(request), request.params.id, request.body)))
    app.post<Id & { Body: CertificationVersion }>('/certifications/:id/submit', { schema: s.submitSchema, bodyLimit: 1024 },
      async request => apiResponse(await d.service.submit(await actor(request), request.params.id, request.body.expectedVersion)))
    app.get<{ Params: CertificationQueueParams } & Page>('/organizations/:orgId/certifications/review-queue', { schema: s.organizationQueueSchema },
      async request => apiResponse(await d.service.queue(await actor(request), { type: 'organization', organizationId: request.params.orgId }, request.query)))
    app.get<{ Params: CertificationQueueParams } & Page>('/organizations/:orgId/certifications/appeal-queue', { schema: s.organizationQueueSchema },
      async request => apiResponse(await d.service.queue(await actor(request), { type: 'organization', organizationId: request.params.orgId }, request.query, true)))
    app.get<Page>('/admin/certifications/appeal-queue', { schema: s.mineSchema },
      async request => apiResponse(await d.service.queue(await actor(request), { type: 'platform', organizationId: null }, request.query, true)))
    app.get<Page>('/admin/certifications/review-queue', { schema: s.mineSchema },
      async request => apiResponse(await d.service.queue(await actor(request), { type: 'platform', organizationId: null }, request.query)))
    app.post<{ Params: OrganizationCertificationParams; Body: CertificationDecision }>('/organizations/:orgId/certifications/:id/decision',
      { schema: s.organizationDecisionSchema, bodyLimit: 4096 }, async request => apiResponse(await d.review.decide(await actor(request), request.params.id,
        { type: 'organization', organizationId: request.params.orgId }, request.body)))
    app.post<{ Params: OrganizationCertificationParams; Body: RevokeCertification }>('/organizations/:orgId/certifications/:id/revoke',
      { schema: s.revokeSchema, bodyLimit: 4096 }, async request => apiResponse(await d.review.decide(await actor(request), request.params.id,
        { type: 'organization', organizationId: request.params.orgId }, { ...request.body, decision: 'revoke' })))
    app.post<Id & { Body: CertificationDecision }>('/admin/certifications/:id/decision', { schema: s.decisionSchema, bodyLimit: 4096 },
      async request => apiResponse(await d.review.decide(await actor(request), request.params.id, { type: 'platform', organizationId: null }, request.body)))
    app.post<Id & { Body: CreateCertificationAppeal }>('/certifications/:id/appeals', { schema: s.appealCreateSchema, bodyLimit: 8192 },
      async (request, reply) => reply.code(201).send(apiResponse(await d.appeals.create(await actor(request), request.params.id, request.body))))
    app.get<Id & Page>('/certifications/:id/appeals', { schema: s.appealsSchema },
      async request => apiResponse(await d.appeals.list(await actor(request), request.params.id, request.query)))
    app.get<{ Params: CertificationAppealParams }>('/certifications/:id/appeals/:appealId/application', { schema: s.appealApplicationSchema },
      async request => apiResponse(await d.appeals.application(await actor(request), request.params.id, request.params.appealId)))
    app.post<{ Params: CertificationAppealParams; Body: CertificationAppealDecision }>('/certifications/:id/appeals/:appealId/decision',
      { schema: s.appealDecisionSchema, bodyLimit: 4096 }, async request => apiResponse(
        await d.appeals.decide(await actor(request), request.params.id, request.params.appealId, request.body)))
    app.get<{ Params: CertificationEvidenceParams }>('/certifications/:id/evidence/:mediaId/read-url', { schema: s.evidenceSchema },
      async request => apiResponse(await d.evidence.read(await actor(request), request.params.id, request.params.mediaId)))
    app.get<{ Params: CertificationAppealEvidenceParams }>('/certifications/:id/appeals/:appealId/evidence/:mediaId/read-url', { schema: s.appealEvidenceSchema },
      async request => apiResponse(await d.evidence.read(await actor(request), request.params.id, request.params.mediaId, request.params.appealId)))
  }
}
