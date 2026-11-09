import { Type, type Static } from '@sinclair/typebox'
import { PageQuerySchema, pagedDataSchema } from './pagination.js'

const Uuid = Type.String({ pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' })
const Version = Type.Integer({ minimum: 1 })
const Text = (maxLength: number) => Type.String({ minLength: 1, maxLength, pattern: '\\S' })
const Status = Type.Union(['draft', 'published', 'unpublished'].map(value => Type.Literal(value)))
export const LearningIdSchema = Type.Object({ id: Uuid }, { additionalProperties: false })
export const LearningVersionParamsSchema = Type.Object({ id: Uuid, version: Type.String({ pattern: '^[1-9][0-9]{0,8}$' }) }, { additionalProperties: false })
export const LearningMediaParamsSchema = Type.Object({ id: Uuid, mediaId: Uuid }, { additionalProperties: false })
export const LearningExpectedSchema = Type.Object({ expectedRevision: Version }, { additionalProperties: false })
export const LearningCategoryInputSchema = Type.Object({
  parentId: Type.Union([Uuid, Type.Null()]), name: Text(100), slug: Type.String({ pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$', maxLength: 100 }),
  status: Type.Union([Type.Literal('active'), Type.Literal('disabled')]),
}, { additionalProperties: false })
export const LearningCategoryUpdateSchema = Type.Object({ ...LearningCategoryInputSchema.properties, expectedRevision: Version }, { additionalProperties: false })
export const LearningCategorySchema = Type.Object({ ...LearningCategoryInputSchema.properties,
  id: Uuid, depth: Type.Integer({ minimum: 1, maximum: 3 }), revision: Version,
}, { additionalProperties: false })
// 正文首发为纯文本段落，禁止任意 HTML、外部 URL 或隐含媒体引用；媒体仅由 mediaIds 关联。
export const LearningContentSchema = Type.Object({
  title: Text(200), summary: Type.String({ maxLength: 1000 }),
  body: Type.Array(Type.Object({ text: Text(10000) }, { additionalProperties: false }), { maxItems: 100 }),
  categoryIds: Type.Array(Uuid, { maxItems: 20, uniqueItems: true }),
  mediaIds: Type.Array(Uuid, { maxItems: 20, uniqueItems: true }), allowDownload: Type.Boolean(),
}, { additionalProperties: false })
export const LearningRevisionInputSchema = Type.Object({ ...LearningContentSchema.properties, expectedRevision: Version }, { additionalProperties: false })
export const LearningPublishSchema = Type.Object({ expectedRevision: Version, version: Version }, { additionalProperties: false })
export const LearningAssetSchema = Type.Object({
  id: Uuid, status: Status, revision: Version, latestVersion: Version, publishedVersion: Type.Union([Version, Type.Null()]),
}, { additionalProperties: false })
export const LearningVersionSchema = Type.Object({ ...LearningContentSchema.properties,
  assetId: Uuid, version: Version, createdAt: Type.String({ format: 'date-time' }), createdBy: Uuid,
}, { additionalProperties: false })
export const LearningDetailSchema = Type.Object({ asset: LearningAssetSchema, content: LearningVersionSchema }, { additionalProperties: false })
export const LearningSummarySchema = Type.Object({ id: Uuid, status: Status, revision: Version, version: Version,
  title: Text(200), summary: Type.String({ maxLength: 1000 }), allowDownload: Type.Boolean(),
}, { additionalProperties: false })
export const LearningQuerySchema = Type.Object({ ...PageQuerySchema.properties,
  q: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })), categoryId: Type.Optional(Uuid),
}, { additionalProperties: false })
export const LearningReadQuerySchema = Type.Object({ mode: Type.Union([Type.Literal('view'), Type.Literal('download')]) }, { additionalProperties: false })
export const LearningReadSchema = Type.Object({ url: Type.String(), expiresAt: Type.String({ format: 'date-time' }) }, { additionalProperties: false })
export const LearningCategoryListSchema = pagedDataSchema(LearningCategorySchema)
export const LearningAssetListSchema = pagedDataSchema(LearningSummarySchema)
export const LearningVersionListSchema = pagedDataSchema(LearningVersionSchema)
export type LearningCategoryInput = Static<typeof LearningCategoryInputSchema>
export type LearningCategoryUpdate = Static<typeof LearningCategoryUpdateSchema>
export type LearningCategory = Static<typeof LearningCategorySchema>
export type LearningContent = Static<typeof LearningContentSchema>
export type LearningRevisionInput = Static<typeof LearningRevisionInputSchema>
export type LearningAsset = Static<typeof LearningAssetSchema>
export type LearningVersion = Static<typeof LearningVersionSchema>
export type LearningDetail = Static<typeof LearningDetailSchema>
export type LearningSummary = Static<typeof LearningSummarySchema>
export type LearningQuery = Static<typeof LearningQuerySchema>
export type LearningId = Static<typeof LearningIdSchema>
export type LearningVersionParams = Static<typeof LearningVersionParamsSchema>
export type LearningMediaParams = Static<typeof LearningMediaParamsSchema>
export type LearningExpected = Static<typeof LearningExpectedSchema>
export type LearningPublish = Static<typeof LearningPublishSchema>
export type LearningReadQuery = Static<typeof LearningReadQuerySchema>
