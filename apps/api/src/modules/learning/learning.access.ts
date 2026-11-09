import type { AuditAction } from '@refs-tools/contracts/audit'
import type { LearningAsset, LearningContent } from '@refs-tools/contracts/learning'
import { validateMediaPolicy } from '@refs-tools/domain'
import { DomainError } from '../../application/errors.js'
import { appendAudit } from '../audit/audit.service.js'
import { requirePermission } from '../authorization/authorization.service.js'
import type { LearningDependencies, LearningRepositories } from './learning.types.js'

/** 浏览允许未验证邮箱，写入仍要求当前有效且已验证账号。 */
export async function learningAccount(r: LearningRepositories, actor: string, write = false) {
  const account = await r.media.lockAccount(actor)
  if (!account) throw new DomainError('UNAUTHENTICATED', '请重新登录', 401)
  if (write && !account.verified) throw new DomainError('EMAIL_NOT_VERIFIED', '请先验证邮箱', 403)
}

/** 使用现有平台策略；管理员只可下线，编辑与分类维护不隐含管理员权限。 */
export async function learningPermission(r: LearningRepositories, d: LearningDependencies, actor: string,
  permission: 'content.edit' | 'content.unpublish' | 'platform.manage' = 'content.edit') {
  await learningAccount(r, actor, true)
  await requirePermission(r.authorization, { subjectUserId: actor, permission, resource: { type: 'platform', id: null } }, d.now(), d.permissions)
}

/** 隐藏草稿、已下线及不存在的资料。 */
export function learningHidden() { return new DomainError('NOT_FOUND', '学习资料不存在', 404) }

/** 聚合 revision 与内容 version 分离，所有写操作要求显式 revision。 */
export function learningRevision(record: LearningAsset, expected: number) {
  if (record.revision !== expected) throw new DomainError('VERSION_CONFLICT', '资料已更新，请重新读取', 409)
}

/** 新关联限本人媒体；同一资料上一版本中的媒体可由其他编辑保留，发布时重新锁定核验。 */
export async function learningReferences(r: LearningRepositories, input: LearningContent, actor?: string, retained: string[] = []) {
  if (!await r.learning.activeCategories(input.categoryIds)) throw new DomainError('LEARNING_CATEGORY_INVALID', '分类不存在或已停用', 422)
  for (const id of [...input.mediaIds].sort()) {
    const media = await r.media.find(id)
    if (!media || media.status !== 'available' || media.purpose !== 'learning' || media.target.type !== 'platform'
      || media.target.id !== null || (actor && media.ownerUserId !== actor && !retained.includes(id))
      || media.verifiedSizeBytes === null || media.verifiedSizeBytes !== media.expectedSizeBytes
      || validateMediaPolicy({ purpose: 'learning', contentType: media.contentType, sizeBytes: media.verifiedSizeBytes,
        ...(media.contentType.startsWith('image/') ? { imageKind: 'original' as const } : {}) })) {
      throw new DomainError('LEARNING_MEDIA_INVALID', '媒体须为当前资料可引用的已核验学习文件', 422)
    }
  }
}

/** 业务写入与最小状态审计同事务，正文、签名与媒体 key 不进入审计。 */
export async function learningAudit(r: LearningRepositories, d: LearningDependencies, actor: string, id: string,
  action: AuditAction, before: LearningAsset | null, after: LearningAsset | null) {
  await appendAudit(r.audit, { actorUserId: actor, action,
    resourceType: action === 'learning.category_changed' ? 'learning_category' : 'learning_asset', resourceId: id,
    scopeType: 'platform', scopeId: null, organizationId: null, reason: null,
    before: before ? { status: before.status, version: before.revision } : null,
    after: after ? { status: after.status, version: after.revision } : null }, d.now())
}
