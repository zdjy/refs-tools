import { isPermitted, type ResourceScope } from '@refs-tools/domain'
import { DomainError } from '../../application/errors.js'
import type { AuthorizationCheck, AuthorizationDependencies, AuthorizationRepository } from './authorization.types.js'

/** 在调用者的事务 Repository 上实时解析归属；可供业务变更与审计共用同一连接。 */
export async function requirePermission(repository: AuthorizationRepository, check: AuthorizationCheck, now: Date): Promise<ResourceScope> {
  const resource = await repository.resolveScope(check.resource)
  if (!resource) throw new DomainError('NOT_FOUND', '请求的资源不存在', 404)
  const bindings = await repository.findBindings(check.subjectUserId)
  const activeMember = resource.organizationId !== null
    ? await repository.isActiveMember(check.subjectUserId, resource.organizationId) : false
  if (!isPermitted(check.permission, { subjectUserId: check.subjectUserId, bindings, resource, activeMember, now: now.toISOString() })) {
    // 隐藏组织/个人资源存在性；平台门禁不存在对象枚举风险，可明确返回权限不足。
    throw new DomainError(resource.type === 'platform' ? 'FORBIDDEN' : 'NOT_FOUND',
      resource.type === 'platform' ? '无权执行此操作' : '请求的资源不存在', resource.type === 'platform' ? 403 : 404)
  }
  return resource
}

/** 独立只读授权用例；写用例应直接在自身事务中复用 requirePermission，避免跨事务检查后写入。 */
export class AuthorizationService {
  constructor(private readonly dependencies: AuthorizationDependencies) {}

  async require(check: AuthorizationCheck): Promise<ResourceScope> {
    return this.dependencies.transaction.run(({ authorization }) => requirePermission(authorization, check, this.dependencies.now()))
  }
}
