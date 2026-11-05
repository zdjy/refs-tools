import { Type, type Static } from '@sinclair/typebox'
import { RoleSchema } from './authorization.js'
import { PageQuerySchema, pagedResponseSchema } from './pagination.js'

export const AdminUserStatusSchema = Type.Union([Type.Literal('active'), Type.Literal('disabled')])
export const AdminUserSchema = Type.Object({
  id: Type.String({ format: 'uuid' }), email: Type.String({ format: 'email' }), displayName: Type.String(),
  emailVerified: Type.Boolean(), status: AdminUserStatusSchema, createdAt: Type.String({ format: 'date-time' }),
  version: Type.Integer({ minimum: 1 }), roles: Type.Array(RoleSchema),
}, { additionalProperties: false })
export const AdminUserParamsSchema = Type.Object({ id: Type.String({ format: 'uuid' }) }, { additionalProperties: false })
export const AdminUserQuerySchema = Type.Object({
  keyword: Type.Optional(Type.String({ maxLength: 100 })), status: Type.Optional(AdminUserStatusSchema),
  ...PageQuerySchema.properties,
}, { additionalProperties: false })
export const CreateAdminUserSchema = Type.Object({
  email: Type.String({ format: 'email', maxLength: 254 }), displayName: Type.String({ minLength: 1, maxLength: 80 }),
  password: Type.String({ minLength: 1, maxLength: 128 }),
}, { additionalProperties: false })
export const UpdateAdminUserSchema = Type.Object({
  displayName: Type.String({ minLength: 1, maxLength: 80 }), status: AdminUserStatusSchema,
  version: Type.Integer({ minimum: 1 }),
}, { additionalProperties: false })
export const DeleteAdminUserSchema = Type.Object({ version: Type.Integer({ minimum: 1 }) }, { additionalProperties: false })
export const AdminUserResponseSchema = Type.Object({ data: AdminUserSchema })
export const AdminUserListResponseSchema = pagedResponseSchema(AdminUserSchema)
export type AdminUser = Static<typeof AdminUserSchema>
export type AdminUserQuery = Static<typeof AdminUserQuerySchema>
export type AdminUserList = Static<typeof AdminUserListResponseSchema>['data']
export type CreateAdminUser = Static<typeof CreateAdminUserSchema>
export type UpdateAdminUser = Static<typeof UpdateAdminUserSchema>
export type DeleteAdminUser = Static<typeof DeleteAdminUserSchema>
export type AdminUserParams = Static<typeof AdminUserParamsSchema>
