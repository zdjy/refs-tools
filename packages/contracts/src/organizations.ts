import { Type, type Static } from '@sinclair/typebox'

export const OrganizationStatusSchema = Type.Union([
  Type.Literal('pending_review'), Type.Literal('active'), Type.Literal('frozen'),
  Type.Literal('rejected'), Type.Literal('dissolved'),
])
export const OrganizationSchema = Type.Object({
  id: Type.String({ format: 'uuid' }), name: Type.String(), region: Type.String(), purpose: Type.String(),
  ownerUserId: Type.String({ format: 'uuid' }), status: OrganizationStatusSchema,
  createdAt: Type.String({ format: 'date-time' }), version: Type.Integer({ minimum: 1 }),
}, { additionalProperties: false })
export const OrganizationDetailSchema = Type.Object({
  ...OrganizationSchema.properties, ownerLegalName: Type.String(), contact: Type.String(),
  reviewedBy: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
  reviewedAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
  governanceReason: Type.Union([Type.String(), Type.Null()]),
}, { additionalProperties: false })
export const OrganizationParamsSchema = Type.Object({ id: Type.String({ format: 'uuid' }) }, { additionalProperties: false })
export const OrganizationQuerySchema = Type.Object({
  keyword: Type.Optional(Type.String({ maxLength: 100 })), status: Type.Optional(OrganizationStatusSchema),
  page: Type.Optional(Type.String({ pattern: '^[1-9][0-9]{0,5}$' })),
  pageSize: Type.Optional(Type.String({ pattern: '^(?:10|20|50|100)$' })),
}, { additionalProperties: false })
export const CreateOrganizationSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 120 }), region: Type.String({ minLength: 1, maxLength: 100 }),
  purpose: Type.String({ minLength: 1, maxLength: 1000 }), ownerUserId: Type.String({ format: 'uuid' }),
  ownerLegalName: Type.String({ minLength: 1, maxLength: 80 }), contact: Type.String({ minLength: 1, maxLength: 200 }),
}, { additionalProperties: false })
export const OrganizationDecisionSchema = Type.Object({
  action: Type.Union([Type.Literal('approve'), Type.Literal('reject'), Type.Literal('freeze'), Type.Literal('unfreeze')]),
  expectedVersion: Type.Integer({ minimum: 1 }), reason: Type.String({ minLength: 1, maxLength: 500 }),
}, { additionalProperties: false })
export const OrganizationResponseSchema = Type.Object({ data: OrganizationDetailSchema })
export const OrganizationListResponseSchema = Type.Object({ data: Type.Object({
  items: Type.Array(OrganizationSchema), total: Type.Integer({ minimum: 0 }), page: Type.Integer(), pageSize: Type.Integer(),
}) })
export type Organization = Static<typeof OrganizationSchema>
export type OrganizationDetail = Static<typeof OrganizationDetailSchema>
export type OrganizationQuery = Static<typeof OrganizationQuerySchema>
export type OrganizationList = Static<typeof OrganizationListResponseSchema>['data']
export type CreateOrganization = Static<typeof CreateOrganizationSchema>
export type OrganizationDecision = Static<typeof OrganizationDecisionSchema>
export type OrganizationParams = Static<typeof OrganizationParamsSchema>
