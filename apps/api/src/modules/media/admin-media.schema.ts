import { AdminMediaDeleteResponseSchema, AdminMediaListResponseSchema, AdminMediaOperationSchema,
  AdminMediaQuerySchema, AdminMediaReadResponseSchema, AdminMediaResponseSchema } from '@refs-tools/contracts/admin-media'
import { MediaParamsSchema } from '@refs-tools/contracts/media'

export const listAdminMediaSchema = { querystring: AdminMediaQuerySchema, response: { 200: AdminMediaListResponseSchema } }
export const detailAdminMediaSchema = { params: MediaParamsSchema, response: { 200: AdminMediaResponseSchema } }
export const readAdminMediaSchema = { params: MediaParamsSchema, body: AdminMediaOperationSchema, response: { 200: AdminMediaReadResponseSchema } }
export const deleteAdminMediaSchema = { params: MediaParamsSchema, body: AdminMediaOperationSchema, response: { 200: AdminMediaDeleteResponseSchema } }
