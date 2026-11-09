import { Type } from '@sinclair/typebox'
import { PageQuerySchema } from '@refs-tools/contracts/pagination'
import * as c from '@refs-tools/contracts/learning'

const headers = Type.Object({ 'idempotency-key': Type.String({ minLength: 1, maxLength: 100, pattern: '^[A-Za-z0-9._:-]+$' }) })
const response = <T extends import('@sinclair/typebox').TSchema>(data: T) => ({ 200: Type.Object({ data }) })
export const categories = { querystring: PageQuerySchema, response: response(c.LearningCategoryListSchema) }
export const categoryCreate = { headers, body: c.LearningCategoryInputSchema, response: { 201: Type.Object({ data: c.LearningCategorySchema }) } }
export const categoryUpdate = { params: c.LearningIdSchema, body: c.LearningCategoryUpdateSchema, response: response(c.LearningCategorySchema) }
export const list = { querystring: c.LearningQuerySchema, response: response(c.LearningAssetListSchema) }
export const detail = { params: c.LearningIdSchema, response: response(c.LearningDetailSchema) }
export const create = { body: c.LearningContentSchema,
  headers,
  response: { 201: Type.Object({ data: c.LearningDetailSchema }) } }
export const revise = { params: c.LearningIdSchema, body: c.LearningRevisionInputSchema, response: response(c.LearningDetailSchema) }
export const publish = { params: c.LearningIdSchema, body: c.LearningPublishSchema, response: response(c.LearningAssetSchema) }
export const unpublish = { params: c.LearningIdSchema, body: c.LearningExpectedSchema, response: response(c.LearningAssetSchema) }
export const history = { params: c.LearningIdSchema, querystring: PageQuerySchema, response: response(c.LearningVersionListSchema) }
export const snapshot = { params: c.LearningVersionParamsSchema, response: response(c.LearningVersionSchema) }
export const read = { params: c.LearningMediaParamsSchema, querystring: c.LearningReadQuerySchema, response: response(c.LearningReadSchema) }
