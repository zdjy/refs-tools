import { Type, type Static } from '@sinclair/typebox'
import { PageQuerySchema, pagedResponseSchema } from './pagination.js'

const Uuid = Type.String({ format: 'uuid' })
const NullableUuid = Type.Union([Uuid, Type.Null()])
const Timestamp = Type.String({ format: 'date-time' })
const Text = (maxLength: number) => Type.String({ minLength: 1, maxLength, pattern: '\\S' })
export const CertificationScopeSchema = Type.Union([
  Type.Object({ type: Type.Literal('platform'), organizationId: Type.Null() }, { additionalProperties: false }),
  Type.Object({ type: Type.Literal('organization'), organizationId: Uuid }, { additionalProperties: false }),
])
export const QualificationLevelSchema = Type.Union((['national', 'level_1', 'level_2', 'level_3'] as const).map(v => Type.Literal(v)))
// 申诉使用独立状态，不以 appeal_pending 覆盖认证原有的效力。
export const CertificationStatusSchema = Type.Union(([
  'draft', 'under_review', 'approved', 'rejected', 'suspended', 'revoked', 'needs_more_information',
] as const).map(v => Type.Literal(v)))
export const CertificationMaterialsSchema = Type.Object({
  level: QualificationLevelSchema, certificateNumber: Text(120), issuer: Text(200),
  obtainedAt: Type.Union([Type.String({ format: 'date' }), Type.Null()]),
  evidenceMediaIds: Type.Array(Uuid, { minItems: 1, maxItems: 10, uniqueItems: true }),
  historyMediaIds: Type.Array(Uuid, { minItems: 1, maxItems: 10, uniqueItems: true }), statement: Text(2000),
}, { additionalProperties: false })
export const CreateCertificationSchema = Type.Object({
  scope: CertificationScopeSchema, ...CertificationMaterialsSchema.properties,
}, { additionalProperties: false })
export const CertificationVersionSchema = Type.Object({ expectedVersion: Type.Integer({ minimum: 1 }) }, { additionalProperties: false })
export const UpdateCertificationSchema = Type.Object({
  ...CertificationMaterialsSchema.properties, ...CertificationVersionSchema.properties,
}, { additionalProperties: false })
export const RevokeCertificationSchema = Type.Object({ ...CertificationVersionSchema.properties, reason: Text(500) }, { additionalProperties: false })
export const CertificationDecisionSchema = Type.Object({
  ...CertificationVersionSchema.properties,
  decision: Type.Union((['approve', 'reject', 'needs_more_information', 'suspend', 'resume', 'revoke'] as const).map(v => Type.Literal(v))),
  reason: Text(500),
}, { additionalProperties: false })
export const CertificationSchema = Type.Object({
  id: Uuid, subjectUserId: Uuid, scope: CertificationScopeSchema, ...CertificationMaterialsSchema.properties,
  status: CertificationStatusSchema,
  /** 当前成员/组织现状派生的效力；不会改写历史审核结论，重入只恢复未撤销且未手动暂停的认证。 */
  effectiveStatus: CertificationStatusSchema,
  reviewedBy: NullableUuid, reviewedAt: Type.Union([Timestamp, Type.Null()]),
  reviewNote: Type.Union([Type.String(), Type.Null()]), version: Type.Integer({ minimum: 1 }),
  createdAt: Timestamp, updatedAt: Timestamp,
}, { additionalProperties: false })
export const CertificationSummarySchema = Type.Pick(CertificationSchema,
  ['id', 'subjectUserId', 'scope', 'level', 'status', 'effectiveStatus', 'reviewedAt', 'version', 'createdAt', 'updatedAt'])
export const CertificationParamsSchema = Type.Object({ id: Uuid }, { additionalProperties: false })
export const CertificationQueueParamsSchema = Type.Object({ orgId: Uuid }, { additionalProperties: false })
export const OrganizationCertificationParamsSchema = Type.Object({ orgId: Uuid, id: Uuid }, { additionalProperties: false })
export const CertificationQuerySchema = PageQuerySchema
export const CertificationResponseSchema = Type.Object({ data: CertificationSchema })
export const CertificationListResponseSchema = pagedResponseSchema(CertificationSummarySchema)
export const CertificationHistorySchema = Type.Object({
  record: CertificationSchema, actorUserId: Uuid, action: Type.String(), createdAt: Timestamp,
}, { additionalProperties: false })
export const CertificationHistoryResponseSchema = pagedResponseSchema(CertificationHistorySchema)
export const CreateCertificationAppealSchema = Type.Object({
  ...CertificationVersionSchema.properties, reason: Text(500),
  evidenceMediaIds: Type.Array(Uuid, { maxItems: 10, uniqueItems: true }),
}, { additionalProperties: false })
export const CertificationAppealSchema = Type.Object({
  id: Uuid, certificationId: Uuid, appellantId: Uuid, reason: Type.String(), evidenceMediaIds: Type.Array(Uuid),
  status: Type.Union([Type.Literal('pending'), Type.Literal('decided')]),
  originalReviewerId: NullableUuid, reviewerId: NullableUuid,
  decision: Type.Union([Type.Literal('uphold'), Type.Literal('overturn'), Type.Literal('needs_more_information'), Type.Null()]),
  reviewReason: Type.Union([Type.String(), Type.Null()]), createdAt: Timestamp, decidedAt: Type.Union([Timestamp, Type.Null()]),
}, { additionalProperties: false })
export const CertificationAppealDecisionSchema = Type.Object({
  ...CertificationVersionSchema.properties,
  decision: Type.Union((['uphold', 'overturn', 'needs_more_information'] as const).map(v => Type.Literal(v))), reason: Text(500),
}, { additionalProperties: false })
export const CertificationEvidenceParamsSchema = Type.Object({ id: Uuid, mediaId: Uuid }, { additionalProperties: false })
export const CertificationAppealEvidenceParamsSchema = Type.Object({ id: Uuid, appealId: Uuid, mediaId: Uuid }, { additionalProperties: false })
export const CertificationAppealParamsSchema = Type.Object({ id: Uuid, appealId: Uuid }, { additionalProperties: false })
export const CertificationAppealResponseSchema = Type.Object({ data: CertificationAppealSchema })
export const CertificationAppealListResponseSchema = pagedResponseSchema(CertificationAppealSchema)
export type CertificationScope = Static<typeof CertificationScopeSchema>
export type CertificationStatus = Static<typeof CertificationStatusSchema>
export type CertificationMaterials = Static<typeof CertificationMaterialsSchema>
export type Certification = Static<typeof CertificationSchema>
export type CertificationSummary = Static<typeof CertificationSummarySchema>
export type CreateCertification = Static<typeof CreateCertificationSchema>
export type UpdateCertification = Static<typeof UpdateCertificationSchema>
export type CertificationVersion = Static<typeof CertificationVersionSchema>
export type RevokeCertification = Static<typeof RevokeCertificationSchema>
export type CertificationDecision = Static<typeof CertificationDecisionSchema>
export type CertificationHistory = Static<typeof CertificationHistorySchema>
export type CertificationAppeal = Static<typeof CertificationAppealSchema>
export type CreateCertificationAppeal = Static<typeof CreateCertificationAppealSchema>
export type CertificationAppealDecision = Static<typeof CertificationAppealDecisionSchema>
export type CertificationParams = Static<typeof CertificationParamsSchema>
export type OrganizationCertificationParams = Static<typeof OrganizationCertificationParamsSchema>
export type CertificationQueueParams = Static<typeof CertificationQueueParamsSchema>
export type CertificationAppealEvidenceParams = Static<typeof CertificationAppealEvidenceParamsSchema>
export type CertificationEvidenceParams = Static<typeof CertificationEvidenceParamsSchema>
export type CertificationAppealParams = Static<typeof CertificationAppealParamsSchema>
