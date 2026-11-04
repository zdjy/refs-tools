import { Type } from '@sinclair/typebox'
import {
  AdminUserListResponseSchema, AdminUserParamsSchema, AdminUserQuerySchema, AdminUserResponseSchema,
  CreateAdminUserSchema, DeleteAdminUserSchema, UpdateAdminUserSchema,
} from '@refs-tools/contracts/admin-users'

export const listUsersSchema = { querystring: AdminUserQuerySchema, response: { 200: AdminUserListResponseSchema } }
export const detailUserSchema = { params: AdminUserParamsSchema, response: { 200: AdminUserResponseSchema } }
export const createUserSchema = { body: CreateAdminUserSchema, response: { 201: AdminUserResponseSchema } }
export const updateUserSchema = { params: AdminUserParamsSchema, body: UpdateAdminUserSchema, response: { 200: AdminUserResponseSchema } }
export const deleteUserSchema = { params: AdminUserParamsSchema, body: DeleteAdminUserSchema,
  response: { 200: Type.Object({ data: Type.Object({ deleted: Type.Literal(true) }) }) } }
