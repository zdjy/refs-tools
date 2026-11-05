import { Type, type Static, type TSchema } from '@sinclair/typebox'

/**
 * 全站列表查询的分页契约，规则见 `docs/agents/coding-standards/backend.md`。
 * 查询串里的数字保持字符串并由 Service/Repository 显式解析，因为 Fastify 全局禁用隐式类型转换。
 */
export const PageQuerySchema = Type.Object({
  page: Type.Optional(Type.String({ pattern: '^[1-9][0-9]{0,5}$' })),
  pageSize: Type.Optional(Type.String({ pattern: '^(?:10|20|50|100)$' })),
}, { additionalProperties: false })

/** 分页响应必带的元信息；与 `items` 同层，便于前端直接渲染总数与页码。 */
export const PageMetaProperties = {
  total: Type.Integer({ minimum: 0 }),
  page: Type.Integer({ minimum: 1 }),
  pageSize: Type.Integer({ minimum: 1 }),
}

/**
 * 组装分页数据体：`items` + `total/page/pageSize`，需要随列表返回的能力标记
 * （如 `canManage`、`canGrant`）也放在同一层，避免再套一层对象。
 */
export function pagedDataSchema<T extends TSchema, E extends Record<string, TSchema> = Record<never, never>>(item: T, extra?: E) {
  return Type.Object({ items: Type.Array(item), ...PageMetaProperties, ...(extra ?? ({} as E)) })
}

/** 组装完整的 `{ data: ... }` 分页响应 Schema。 */
export function pagedResponseSchema<T extends TSchema, E extends Record<string, TSchema> = Record<never, never>>(item: T, extra?: E) {
  return Type.Object({ data: pagedDataSchema(item, extra) })
}

export type PageQuery = Static<typeof PageQuerySchema>
export type PageMeta = { total: number; page: number; pageSize: number }
/** 列表读取的通用返回值；Repository 直接返回该结构，Service 只补充授权派生字段。 */
export type Paged<T> = PageMeta & { items: T[] }
