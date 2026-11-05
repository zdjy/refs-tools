import { Type, type Static } from '@sinclair/typebox'
import { RoleSchema } from './authorization.js'
import { OrganizationStatusSchema } from './organizations.js'
import { PageQuerySchema, pagedResponseSchema } from './pagination.js'

const Uuid = Type.String({ format: 'uuid' })
const Time = Type.String({ format: 'date-time' })

/** 用户视角的组织：membership 为 null 表示仅是负责人的待审核或被驳回申请，尚无成员关系。 */
export const MyOrganizationSchema = Type.Object({
  id: Uuid, name: Type.String(), region: Type.String(), purpose: Type.String(),
  status: OrganizationStatusSchema, createdAt: Time, isOwner: Type.Boolean(),
  /** 负责人账号 ID：成员名单据此标注负责人并隐藏其移除入口；只是账号标识，不含联系方式。 */
  ownerUserId: Uuid,
  membership: Type.Union([Type.Null(), Type.Object({
    id: Uuid, status: Type.Union([Type.Literal('pending'), Type.Literal('active')]), version: Type.Integer({ minimum: 1 }),
  }, { additionalProperties: false })]),
  roles: Type.Array(RoleSchema),
  /** 服务端按当前授权矩阵计算，仅用于界面呈现；每次写请求仍独立授权。 */
  canManage: Type.Boolean(), canGrantRoles: Type.Boolean(),
  /** 平台驳回或冻结的说明，只向组织负责人返回。 */
  governanceReason: Type.Union([Type.String(), Type.Null()]),
}, { additionalProperties: false })

export const DirectoryQuerySchema = Type.Object({
  keyword: Type.Optional(Type.String({ maxLength: 100 })),
  page: PageQuerySchema.properties.page,
  // 公开目录的页大小上限低于通用分页（50 而非 100），收敛匿名扫描面。
  pageSize: Type.Optional(Type.String({ pattern: '^(?:10|20|50)$' })),
}, { additionalProperties: false })
/** 目录只公开 active 组织的名称、地区、简介和人数，不含负责人、联系方式或成员名单。 */
export const DirectoryItemSchema = Type.Object({
  id: Uuid, name: Type.String(), region: Type.String(), purpose: Type.String(),
  memberCount: Type.Integer({ minimum: 0 }),
  relation: Type.Union([Type.Literal('none'), Type.Literal('pending'), Type.Literal('active')]),
}, { additionalProperties: false })
/**
 * 自助申请载荷。`region` 是账户设置同款地区选择器产出的「省/市/区」展示文本；
 * 负责人实名与联系方式不由客户端提交，服务端在事务内取申请人账户资料（`Profile.legalName` / `Profile.phone`），
 * 因此 Schema 拒绝这两个字段。
 */
export const OrganizationApplicationSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 120 }), region: Type.String({ minLength: 1, maxLength: 100 }),
  purpose: Type.String({ minLength: 1, maxLength: 1000 }),
}, { additionalProperties: false })

/** 本人组织列表；默认页大小 100，保留更大数量时可继续翻页。 */
export const MyOrganizationQuerySchema = PageQuerySchema
export const MyOrganizationResponseSchema = Type.Object({ data: MyOrganizationSchema })
export const MyOrganizationListResponseSchema = pagedResponseSchema(MyOrganizationSchema)
export const DirectoryResponseSchema = pagedResponseSchema(DirectoryItemSchema)
export type MyOrganization = Static<typeof MyOrganizationSchema>
export type MyOrganizationQuery = Static<typeof MyOrganizationQuerySchema>
export type DirectoryQuery = Static<typeof DirectoryQuerySchema>
export type DirectoryItem = Static<typeof DirectoryItemSchema>
export type DirectoryList = Static<typeof DirectoryResponseSchema>['data']
export type OrganizationApplication = Static<typeof OrganizationApplicationSchema>
export type MyOrganizationList = Static<typeof MyOrganizationListResponseSchema>['data']
