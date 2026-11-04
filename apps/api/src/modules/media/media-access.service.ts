import { DomainError } from '../../application/errors.js'
import { requirePermission } from '../authorization/authorization.service.js'
import type { MediaDependencies, MediaRepositories, StoredMedia } from './media.types.js'

/** 每个阶段在当前事务锁定有效账号和资源依据；不复用上一阶段的权限结论。 */
export async function requireMediaAccess(repositories: MediaRepositories, actor: string, media: StoredMedia,
  action: 'upload' | 'read' | 'delete', dependencies: MediaDependencies): Promise<string | null> {
  const account = await repositories.media.lockAccount(actor)
  if (!account) throw new DomainError('UNAUTHENTICATED', '请重新登录', 401)
  if (action !== 'read' && !account.verified) throw new DomainError('EMAIL_NOT_VERIFIED', '请先验证邮箱', 403)
  if (action === 'upload' && media.ownerUserId !== actor) throw hidden()
  // 头像需要跨用户展示；仅 avatar 用途开放登录读，其余用途保持 owner/target 私有。
  if (action === 'read' && media.purpose === 'avatar') return null
  const target = media.target
  if (target.type === 'attempt' || target.type === 'match') {
    if (!dependencies.businessAccess) throw hidden()
    await dependencies.businessAccess(repositories, actor, media, action)
    return null
  }
  if (media.ownerUserId !== actor) throw hidden()
  if (target.type === 'platform') {
    await requirePermission(repositories.authorization, { subjectUserId: actor, permission: 'content.edit',
      resource: { type: 'platform', id: null } }, dependencies.now(), dependencies.permissions)
  } else if (target.type === 'organization') {
    const scope = await repositories.authorization.resolveScope({ type: 'organization', id: target.id })
    if (!scope || scope.organizationStatus !== 'active' || !await repositories.authorization.isActiveMember(actor, target.id!)) throw hidden()
    return scope.organizationId
  }
  return null
}

/** 统一隐藏不存在、错误用途及不允许关联的目标。 */
export function hidden(): DomainError { return new DomainError('NOT_FOUND', '请求的资源不存在', 404) }

/** 返回最小元数据投影，禁止将 object key、签名或关联目标透出为普通对象响应。 */
export function publicMedia(media: StoredMedia) {
  return { id: media.id, ownerUserId: media.ownerUserId, purpose: media.purpose, status: media.status,
    contentType: media.contentType, expectedSizeBytes: media.expectedSizeBytes, verifiedSizeBytes: media.verifiedSizeBytes, expiresAt: media.expiresAt }
}
