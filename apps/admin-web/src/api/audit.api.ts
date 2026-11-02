import type { AuditList, AuditQuery } from '@refs-tools/contracts/audit'
import { request } from './http'

export const auditApi = {
  list(query: AuditQuery): Promise<AuditList> {
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) if (value) search.set(key, value)
    return request<AuditList>(`/admin/audit-events?${search}`)
  },
}
export type AuditApi = typeof auditApi
