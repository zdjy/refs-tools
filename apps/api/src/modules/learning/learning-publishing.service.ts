import { DomainError } from '../../application/errors.js'
import { learningAudit, learningHidden, learningPermission, learningReferences, learningRevision } from './learning.access.js'
import type { LearningDependencies } from './learning.types.js'

/** 发布重新验证快照和媒体；下线仅撤回普通读取，不删除历史版本。 */
export class LearningPublishingService {
  constructor(private readonly d: LearningDependencies) {}

  async publish(actor: string, id: string, expectedRevision: number, version: number) {
    return this.d.transaction.run(async r => {
      await learningPermission(r, this.d, actor)
      await r.learning.lockCategories()
      const before = await r.learning.asset(id)
      if (!before) throw learningHidden()
      learningRevision(before, expectedRevision)
      if (version !== before.latestVersion) throw new DomainError('LEARNING_VERSION_NOT_LATEST', '请发布最新修订', 409)
      if (before.status === 'published' && before.publishedVersion === version) throw new DomainError('LEARNING_ALREADY_PUBLISHED', '当前版本已经发布', 409)
      const content = (await r.learning.version(id, version))!
      if (!content.body.length && !content.mediaIds.length) throw new DomainError('LEARNING_CONTENT_REQUIRED', '请填写正文或关联媒体', 422)
      await learningReferences(r, content)
      const after = { ...before, status: 'published' as const, publishedVersion: version, revision: before.revision + 1 }
      if (!await r.learning.save(after, before.revision)) throw new DomainError('VERSION_CONFLICT', '资料已更新', 409)
      await r.learning.recordPublication(after, actor, this.d.now().toISOString())
      await learningAudit(r, this.d, actor, id, 'learning.published', before, after)
      return after
    })
  }

  async unpublish(actor: string, id: string, expectedRevision: number) {
    return this.d.transaction.run(async r => {
      await learningPermission(r, this.d, actor, 'content.unpublish')
      const before = await r.learning.asset(id)
      if (!before) throw learningHidden()
      learningRevision(before, expectedRevision)
      if (before.status !== 'published') throw new DomainError('LEARNING_NOT_PUBLISHED', '资料当前未发布', 409)
      const after = { ...before, status: 'unpublished' as const, revision: before.revision + 1 }
      if (!await r.learning.save(after, before.revision)) throw new DomainError('VERSION_CONFLICT', '资料已更新', 409)
      await learningAudit(r, this.d, actor, id, 'learning.unpublished', before, after)
      return after
    })
  }
}
