import { describe, expect, it, vi } from 'vitest'
import type { AuditList } from '@refs-tools/contracts/audit'
import { useAudit } from '../src/views/audit/useAudit'
import { ApiError } from '../src/api/http'

const first: AuditList = { items: [], nextCursor: '22222222-2222-4222-8222-222222222222' }
function setup() {
  const api = { list: vi.fn().mockResolvedValue(first) }
  const unauthorized = vi.fn()
  return { api, unauthorized, state: useAudit(unauthorized, api) }
}

describe('平台审计状态', () => {
  it('使用服务端游标翻页，修改筛选从首批开始', async () => {
    const { state, api } = setup()
    await state.search()
    expect(api.list).toHaveBeenLastCalledWith({ limit: '20' })
    await state.next()
    expect(api.list).toHaveBeenLastCalledWith({ limit: '20', cursor: first.nextCursor })
    state.filters.resourceType = 'certification'
    await state.search()
    expect(api.list).toHaveBeenLastCalledWith({ limit: '20', resourceType: 'certification' })
    await state.reset()
    expect(api.list).toHaveBeenLastCalledWith({ limit: '20' })
  })

  it('未提交的筛选不污染下一页；UUID 无效时不请求', async () => {
    const { state, api } = setup()
    await state.search()
    state.filters.scopeType = 'organization'
    await state.next()
    expect(api.list).toHaveBeenLastCalledWith({ limit: '20', cursor: first.nextCursor })
    state.filters.resourceId = 'invalid'
    await state.search()
    expect(api.list).toHaveBeenCalledTimes(2)
    expect(state.fieldError.value).toContain('UUID')
    state.filters.resourceId = ` ${first.nextCursor} `
    await state.search()
    expect(api.list).toHaveBeenLastCalledWith({ limit: '20', scopeType: 'organization', resourceId: first.nextCursor })
  })

  it.each([0, 500, 403, 401])('错误 %s 清空旧记录；重试保留当前游标', async (status) => {
    const { state, api, unauthorized } = setup()
    await state.search()
    api.list.mockRejectedValueOnce(new ApiError(status, 'UNAVAILABLE'))
    await state.next()
    expect(state.result.value).toBeNull()
    expect(state.error.value).not.toBe('')
    expect(state.forbidden.value).toBe(status === 403)
    expect(unauthorized).toHaveBeenCalledTimes(status === 401 ? 1 : 0)
    await state.retry()
    expect(api.list).toHaveBeenLastCalledWith({ limit: '20', cursor: first.nextCursor })
  })

  it('成功空列表不同于失败，末尾不发翻页请求', async () => {
    const { state, api } = setup()
    api.list.mockResolvedValueOnce({ items: [], nextCursor: null })
    await state.search()
    expect(state.error.value).toBe('')
    expect(state.result.value?.items).toEqual([])
    await state.next()
    expect(api.list).toHaveBeenCalledTimes(1)
  })

  it('加载时拒绝重复请求，销毁后清空数据且丢弃迟到响应', async () => {
    const { state, api } = setup()
    let done!: (data: AuditList) => void
    api.list.mockImplementationOnce(() => new Promise(resolve => { done = resolve }))
    const work = state.search()
    await state.search()
    expect(api.list).toHaveBeenCalledTimes(1)
    state.dispose()
    done(first)
    await work
    expect(state.result.value).toBeNull()
    await state.retry()
    expect(api.list).toHaveBeenCalledTimes(1)
  })
})
