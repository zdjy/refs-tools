import type { MediaProviderEvent } from '@refs-tools/contracts/media'
import { DomainError } from '../../application/errors.js'
import { hidden, publicMedia, requireMediaAccess } from './media-access.service.js'
import { MediaService } from './media.service.js'
import type { MediaRepositories, ObjectStat, StoredMedia } from './media.types.js'

/** 完成、存储事件及清理共享状态转换；客户端声明和事件都不能代替独立 HEAD。 */
export class MediaCompletionService extends MediaService {
  async complete(actor: string, id: string) {
    const media = await this.locked(actor, id, 'upload')
    const stat = media.status === 'pending_upload' ? await this.dependencies.storage.stat(media.objectKey) : null
    const result = await this.dependencies.transaction.run(async (repositories) => {
      const current = await this.current(repositories, actor, id, 'upload')
      return this.verify(repositories, current, stat)
    })
    return this.completionResult(result)
  }

  async providerEvent(event: MediaProviderEvent) {
    if (event.bucket !== this.dependencies.bucket) throw hidden()
    const media = await this.dependencies.transaction.run(async ({ media: repository }) => repository.find(event.mediaId))
    if (!media || media.objectKey !== event.objectKey) throw hidden()
    const stat = await this.dependencies.storage.stat(media.objectKey)
    await this.dependencies.transaction.run(async (repositories) => {
      await repositories.media.lockAccount(media.ownerUserId)
      const current = await repositories.media.find(media.id)
      if (!current || current.objectKey !== event.objectKey) throw hidden()
      await requireMediaAccess(repositories, current.ownerUserId, current, 'upload', this.dependencies)
      if (!await repositories.media.recordEvent(event, this.dependencies.now().toISOString())) return
      await this.verify(repositories, current, stat)
    })
    return { accepted: true as const }
  }

  async cleanup(limit = 100) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('cleanup limit must be 1..100')
    const candidates = await this.dependencies.transaction.run(({ media }) => media.cleanupCandidates(this.dependencies.now().toISOString(), limit))
    let cleaned = 0
    for (const candidate of candidates) {
      const eligible = await this.dependencies.transaction.run(async ({ media }) => {
        const current = await media.find(candidate.id)
        if (!current || current.status === 'available' || Date.parse(current.expiresAt) > this.dependencies.now().getTime()) return false
        if (current.status === 'pending_upload') await media.transition(current.id, current.status, 'expired', this.dependencies.now().toISOString())
        return true
      })
      if (!eligible) continue
      await this.dependencies.storage.delete(candidate.objectKey)
      await this.dependencies.transaction.run(({ media }) => media.markCleaned(candidate.id, this.dependencies.now().toISOString()))
      cleaned++
    }
    return { cleaned }
  }

  private async verify(repositories: MediaRepositories, media: StoredMedia, stat: ObjectStat | null): Promise<StoredMedia> {
    if (media.status !== 'pending_upload') return media
    const now = this.dependencies.now().toISOString()
    const expired = Date.parse(media.expiresAt) <= Date.parse(now)
    if (!expired && !stat) throw new DomainError('OBJECT_NOT_FOUND', '尚未检测到上传对象，请重试完成确认', 409)
    const valid = stat && stat.sizeBytes === media.expectedSizeBytes && stat.contentType === media.contentType
      && stat.mediaId === media.id && stat.ownerUserId === media.ownerUserId && stat.etag.length > 0 && stat.etag.length <= 200
    const status = expired ? 'expired' : valid ? 'available' : 'rejected'
    await repositories.media.transition(media.id, media.status, status, now, valid && !expired ? stat : undefined)
    return { ...media, status, verifiedSizeBytes: valid && !expired ? stat.sizeBytes : null }
  }

  private completionResult(media: StoredMedia) {
    if (media.status !== 'available') throw new DomainError('MEDIA_VERIFICATION_FAILED', '媒体核验失败或上传已过期', 409)
    return publicMedia(media)
  }
}
