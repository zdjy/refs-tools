import { Type } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'
import { describe, expect, it } from 'vitest'
import { PageQuerySchema, pagedDataSchema, type PageQuery } from '../src/pagination.js'

describe('列表分页契约', () => {
  it('page 从 1 开始，pageSize 只接受枚举值', () => {
    const valid: PageQuery[] = [{}, { page: '1' }, { page: '999999', pageSize: '100' }]
    for (const query of valid) expect(Value.Check(PageQuerySchema, query)).toBe(true)
    for (const query of [{ page: '0' }, { pageSize: '30' }, { pageSize: '1000' }, { extra: 'x' }]) {
      expect(Value.Check(PageQuerySchema, query)).toBe(false)
    }
  })

  it('分页数据体总是带 items 与 total/page/pageSize，并合并附加能力字段', () => {
    const schema = pagedDataSchema(Type.Object({ id: Type.String() }), { canGrant: Type.Boolean() })
    expect(Value.Check(schema, { items: [{ id: 'a' }], total: 1, page: 1, pageSize: 20, canGrant: true })).toBe(true)
    expect(Value.Check(schema, { items: [], total: 0, page: 1 })).toBe(false)
  })
})
