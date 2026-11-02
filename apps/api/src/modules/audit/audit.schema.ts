import { Type } from '@sinclair/typebox'
import { AuditEventSchema, AuditListResponseSchema, AuditQuerySchema, OrganizationAuditParamsSchema } from '@refs-tools/contracts/audit'

export const NewAuditEventSchema = Type.Object({
  ...Type.Omit(AuditEventSchema, ['id', 'createdAt']).properties,
  organizationId: AuditEventSchema.properties.scopeId,
}, { additionalProperties: false })
export const auditListSchema = { querystring: AuditQuerySchema, response: { 200: AuditListResponseSchema } }
export const organizationAuditListSchema = { ...auditListSchema, params: OrganizationAuditParamsSchema }
