import { reactive, ref } from 'vue'
import type { AuditList, AuditQuery } from '@refs-tools/contracts/audit'
import { auditApi, type AuditApi } from '../../api/audit.api'
import { ApiError, errorMessage } from '../../api/http'

/** 手动读取敏感审计；不轮询、不预加载，离开页面后丢弃迟到响应。 */
export function useAudit(onUnauthorized: () => void, api: AuditApi = auditApi) {
  const filters = reactive({ scopeType: '' as NonNullable<AuditQuery['scopeType']> | '', resourceType: '' as NonNullable<AuditQuery['resourceType']> | '', resourceId: '' })
  const fieldError = ref('')
  const result = ref<AuditList | null>(null)
  const loading = ref(false)
  const error = ref('')
  const forbidden = ref(false)
  let revision = 0
  let disposed = false
  let activeQuery: AuditQuery = { limit: '20' }
  let pageCursor: string | undefined

  async function load(query: AuditQuery, cursor?: string) {
    if (loading.value || disposed) return
    const current = ++revision
    activeQuery = { ...query }
    pageCursor = cursor
    loading.value = true
    error.value = ''
    forbidden.value = false
    result.value = null
    try {
      const value = await api.list({ ...query, ...(cursor ? { cursor } : {}) })
      if (current === revision) result.value = value
    } catch (cause) {
      if (current !== revision) return
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized()
      forbidden.value = cause instanceof ApiError && cause.status === 403
      error.value = forbidden.value ? '当前账号没有平台审计读取权限。请联系平台管理员，或返回工作台。' : errorMessage(cause)
    } finally { if (current === revision) loading.value = false }
  }

  async function search() {
    if (loading.value) return
    fieldError.value = ''
    const resourceId = filters.resourceId.trim()
    if (resourceId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resourceId)) {
      fieldError.value = '请输入完整的资源 UUID，或留空查询全部资源。'
      return
    }
    await load({ limit: '20', ...(filters.scopeType ? { scopeType: filters.scopeType } : {}),
      ...(filters.resourceType ? { resourceType: filters.resourceType } : {}), ...(resourceId ? { resourceId } : {}) })
  }

  function next() {
    if (!result.value?.nextCursor || loading.value) return
    return load(activeQuery, result.value.nextCursor)
  }
  function retry() { return load(activeQuery, pageCursor) }
  function reset() {
    if (loading.value) return
    filters.scopeType = ''; filters.resourceType = ''; filters.resourceId = ''
    return search()
  }
  function dispose() { disposed = true; ++revision; result.value = null; loading.value = false }
  return { filters, fieldError, result, loading, error, forbidden, search, next, retry, reset, dispose }
}
