import { afterEach, describe, expect, it, vi } from 'vitest'
import { auditApi } from '../src/api/audit.api'
import { authApi } from '../src/api/auth.api'
import { ApiError, errorMessage } from '../src/api/http'

afterEach(() => vi.unstubAllGlobals())

describe('管理端 API 边界', () => {
  it('密码登录的 401 显示凭据错误而不是会话过期', () => {
    expect(errorMessage(new ApiError(401, 'INVALID_CREDENTIALS'))).toContain('邮箱或密码不正确')
    expect(errorMessage(new ApiError(401, 'UNAUTHENTICATED'))).toContain('登录已失效')
  })
  it('编码查询参数，所有请求显式使用同源 Cookie 和 no-store', async () => {
    const fetcher = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ data: { items: [], nextCursor: null } })))
    vi.stubGlobal('fetch', fetcher)
    await auditApi.list({ resourceType: 'audit_log', scopeType: 'platform', limit: '20' })
    const [url, options] = fetcher.mock.calls[0]!
    expect(url).toBe('/api/v1/admin/audit-events?resourceType=audit_log&scopeType=platform&limit=20')
    expect(options).toMatchObject({ method: 'GET', credentials: 'same-origin', cache: 'no-store' })
    expect(options.headers).not.toHaveProperty('Authorization')
    await authApi.login({ email: 'admin@example.com', password: 'not-a-secret' })
    expect(fetcher.mock.calls[1]?.[1]).toMatchObject({ method: 'POST', body: JSON.stringify({ email: 'admin@example.com', password: 'not-a-secret' }) })
  })

  it.each([401, 403, 500])('保留 HTTP %s 以区分身份、权限和故障', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: 'REJECTED', message: '不应显示的内部信息' } }), { status })))
    await expect(authApi.session()).rejects.toMatchObject({ status, code: 'REJECTED' })
  })

  it('网络和非 JSON 成功响应不伪装为空列表', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(new Response('<html>fallback</html>'))
    vi.stubGlobal('fetch', fetcher)
    await expect(auditApi.list({})).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' })
    await expect(auditApi.list({})).rejects.toBeInstanceOf(ApiError)
  })
})
