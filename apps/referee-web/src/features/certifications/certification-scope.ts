import type { CertificationScope } from '@refs-tools/contracts/certifications'

/** 页面范围只约束办理上下文；资源授权始终由 API 独立执行。 */
export function sameCertificationScope(left: CertificationScope, right: CertificationScope): boolean {
  return left.type === right.type && left.organizationId === right.organizationId
}

/** 旧组织认证深链回到组织内标签；无组织参数的地址继续承载平台认证。 */
export function legacyCertificationTarget(organizationId: unknown): string | null {
  return typeof organizationId === 'string' && organizationId.trim()
    ? `/organizations/${encodeURIComponent(organizationId)}?tab=my-certifications` : null
}
