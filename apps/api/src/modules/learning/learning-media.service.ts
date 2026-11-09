import { DomainError } from '../../application/errors.js'
import { appendAudit } from '../audit/audit.service.js'
import { learningAccount, learningHidden } from './learning.access.js'
import type { LearningDependencies, LearningRepositories } from './learning.types.js'

/** 仅经当前已发布资料签发学习媒体访问，签名外部 IO 后再次核对状态和版本。 */
export class LearningMediaService {
  constructor(private readonly d: LearningDependencies) {}

  async read(actor: string, id: string, mediaId: string, mode: 'view' | 'download') {
    const authorized = await this.d.transaction.run(r => this.authorize(r, actor, id, mediaId, mode))
    if (!this.d.storage) throw new DomainError('MEDIA_UNAVAILABLE', '文件访问暂不可用', 503)
    const signed = await this.d.storage.signRead(authorized.media, 60, mode === 'view' ? 'inline' : 'attachment')
    await this.d.transaction.run(async r => {
      const current = await this.authorize(r, actor, id, mediaId, mode)
      if (current.revision !== authorized.revision) throw new DomainError('VERSION_CONFLICT', '资料已更新，请重新打开', 409)
      await appendAudit(r.audit, { actorUserId: actor, action: 'media.read_authorized', resourceType: 'media', resourceId: mediaId,
        scopeType: 'platform', scopeId: null, organizationId: null, reason: null, before: null, after: null }, this.d.now())
    })
    return signed
  }

  private async authorize(r: LearningRepositories, actor: string, id: string, mediaId: string, mode: 'view' | 'download') {
    if (!['view', 'download'].includes(mode)) throw new DomainError('INVALID_REQUEST', '访问方式不符合要求', 400)
    await learningAccount(r, actor)
    const asset = await r.learning.asset(id)
    if (!asset || asset.status !== 'published' || !asset.publishedVersion) throw learningHidden()
    const content = (await r.learning.version(id, asset.publishedVersion))!
    if (!content.mediaIds.includes(mediaId)) throw learningHidden()
    if (mode === 'download' && !content.allowDownload) throw new DomainError('LEARNING_DOWNLOAD_DISABLED', '此资料未开放下载', 403)
    const media = await r.media.find(mediaId)
    if (!media || media.purpose !== 'learning' || media.target.type !== 'platform' || media.target.id !== null) throw learningHidden()
    if (media.status !== 'available') throw new DomainError('MEDIA_NOT_AVAILABLE', '文件暂不可访问', 409)
    return { media, revision: asset.revision }
  }
}
