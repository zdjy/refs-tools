import { Type } from '@sinclair/typebox'
import * as c from '@refs-tools/contracts/certifications'
import { ReadAuthorizationSchema } from '@refs-tools/contracts/media'

const requestHeaders = Type.Object({ 'idempotency-key': Type.String({ pattern: '^[A-Za-z0-9._:-]{1,100}$' }) })
export const createSchema = { headers: requestHeaders, body: c.CreateCertificationSchema, response: { 201: c.CertificationResponseSchema } }
export const mineSchema = { querystring: c.CertificationQuerySchema, response: { 200: c.CertificationListResponseSchema } }
export const detailSchema = { params: c.CertificationParamsSchema, response: { 200: c.CertificationResponseSchema } }
export const updateSchema = { ...detailSchema, body: c.UpdateCertificationSchema }
export const submitSchema = { ...detailSchema, body: c.CertificationVersionSchema }
export const historySchema = { params: c.CertificationParamsSchema, querystring: c.CertificationQuerySchema,
  response: { 200: c.CertificationHistoryResponseSchema } }
export const reviewQueueSchema = { querystring: c.CertificationQuerySchema, response: { 200: c.CertificationReviewListResponseSchema } }
export const organizationQueueSchema = { ...reviewQueueSchema, params: c.CertificationQueueParamsSchema }
export const recordsSchema = { ...reviewQueueSchema, querystring: c.CertificationRecordsQuerySchema }
export const organizationRecordsSchema = { ...recordsSchema, params: c.CertificationQueueParamsSchema }
export const decisionSchema = { ...detailSchema, body: c.CertificationDecisionSchema }
export const organizationDecisionSchema = { ...decisionSchema, params: c.OrganizationCertificationParamsSchema }
export const revokeSchema = { ...organizationDecisionSchema, body: c.RevokeCertificationSchema }
export const appealCreateSchema = { params: c.CertificationParamsSchema, body: c.CreateCertificationAppealSchema,
  response: { 201: c.CertificationAppealResponseSchema } }
export const appealsSchema = { params: c.CertificationParamsSchema, querystring: c.CertificationQuerySchema,
  response: { 200: c.CertificationAppealListResponseSchema } }
export const appealApplicationSchema = { params: c.CertificationAppealParamsSchema, response: { 200: c.CertificationResponseSchema } }
export const appealDecisionSchema = { params: c.CertificationAppealParamsSchema, body: c.CertificationAppealDecisionSchema,
  response: { 200: c.CertificationAppealResponseSchema } }
export const evidenceSchema = { params: c.CertificationEvidenceParamsSchema, response: { 200: Type.Object({ data: ReadAuthorizationSchema }) } }
export const appealEvidenceSchema = { ...evidenceSchema, params: c.CertificationAppealEvidenceParamsSchema }
