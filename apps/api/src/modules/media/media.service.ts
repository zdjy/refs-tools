import { createHash, randomUUID } from 'node:crypto'
import { Value } from '@sinclair/typebox/value'
import { UploadIntentBodySchema, type UploadIntentBody, type UploadIntentResult } from '@refs-tools/contracts/media'
import { validateMediaPolicy } from '@refs-tools/domain'
import { DomainError } from '../../application/errors.js'
import { appendAudit } from '../audit/audit.service.js'
import { hidden, requireMediaAccess } from './media-access.service.js'
import type { MediaDependencies, MediaRepositories, StoredMedia } from './media.types.js'

/** 媒体控制面；存储签名/删除在事务外，返回授权前重新核验当前权限。 */
export class MediaService {
  constructor(protected readonly dependencies: MediaDependencies) {}

  async create(actor: string, input: UploadIntentBody, key: string): Promise<UploadIntentResult> {
    if (!Value.Check(UploadIntentBodySchema, input) || !/^[A-Za-z0-9._:-]{1,100}$/.test(key)) throw new DomainError('INVALID_REQUEST', '上传参数不符合要求', 400)
    const error = validateMediaPolicy(input)
    if (error) throw new DomainError(error, '文件类型、扩展名或大小不符合上传策略', error === 'MEDIA_TOO_LARGE' ? 413 : 422)
    const fingerprint = createHash('sha256').update(JSON.stringify([input.purpose, input.contentType, input.sizeBytes,
      input.fileName ?? null, input.imageKind ?? 'preview', input.target?.type ?? null, input.target?.id ?? null])).digest('hex')
    const media = await this.dependencies.transaction.run(async (repositories) => {
      const candidate = this.newMedia(actor, input)
      await requireMediaAccess(repositories, actor, candidate, 'upload', this.dependencies)
      const previous = await repositories.media.findIntent(actor, key)
      if (previous) {
        if (previous.fingerprint !== fingerprint) throw new DomainError('IDEMPOTENCY_CONFLICT', '同一请求键不能用于不同文件', 409)
        return previous.media
      }
      const quota = await repositories.media.quota(actor, this.dependencies.now().toISOString())
      if (quota.pending >= 10 || quota.daily >= 50) throw new DomainError('RATE_LIMITED', '上传次数已达上限，请稍后重试', 429)
      await repositories.media.insert(candidate, input.fileName ?? null, key, fingerprint)
      return candidate
    })
    return this.authorizeUpload(actor, media)
  }

  async renew(actor: string, id: string): Promise<UploadIntentResult> {
    return this.authorizeUpload(actor, await this.locked(actor, id, 'upload'))
  }

  async read(actor: string, id: string) {
    const media = await this.locked(actor, id, 'read')
    if (media.status !== 'available') throw new DomainError('MEDIA_NOT_AVAILABLE', '媒体尚不可用', 409)
    const authorization = await this.dependencies.storage.signRead(media, 60)
    await this.dependencies.transaction.run(async (repositories) => {
      const current = await this.current(repositories, actor, id, 'read')
      if (current.status !== 'available') throw new DomainError('MEDIA_NOT_AVAILABLE', '媒体尚不可用', 409)
      await this.audit(repositories, actor, current, 'media.read_authorized')
    })
    return authorization
  }

  async remove(actor: string, id: string) {
    const media = await this.dependencies.transaction.run(async (repositories) => {
      const current = await this.current(repositories, actor, id, 'delete')
      if ((current.purpose === 'learning' && await repositories.media.hasLearningReferences(id))
        || (current.status === 'available' && ['certification_evidence', 'exam_answer', 'post_game_record'].includes(current.purpose))) {
        throw new DomainError('MEDIA_RETENTION_REQUIRED', '留存材料须由所属业务审批删除', 409)
      }
      if (current.status !== 'deleted') {
        await repositories.media.transition(id, current.status, 'deleted', this.dependencies.now().toISOString())
        await this.audit(repositories, actor, current, 'media.deleted')
      }
      return current
    })
    // 先撤销可读性；存储失败时重试 DELETE，不回滚为可读对象。
    await this.dependencies.storage.delete(media.objectKey)
    return { status: 'deleted' as const }
  }

  protected async current(repositories: MediaRepositories, actor: string, id: string, action: 'upload' | 'read' | 'delete') {
    if (!await repositories.media.lockAccount(actor)) throw new DomainError('UNAUTHENTICATED', '请重新登录', 401)
    const media = await repositories.media.find(id)
    if (!media) throw hidden()
    await requireMediaAccess(repositories, actor, media, action, this.dependencies)
    return media
  }

  protected async locked(actor: string, id: string, action: 'upload' | 'read' | 'delete') {
    return this.dependencies.transaction.run((repositories) => this.current(repositories, actor, id, action))
  }

  protected async audit(repositories: MediaRepositories, actor: string, media: StoredMedia, action: 'media.read_authorized' | 'media.deleted') {
    const scope = media.target.type === 'organization' ? { type: 'organization' as const, id: media.target.id } : { type: 'self' as const, id: media.ownerUserId }
    await appendAudit(repositories.audit, { actorUserId: actor, action, resourceType: 'media', resourceId: media.id,
      scopeType: scope.type, scopeId: scope.id, organizationId: scope.type === 'organization' ? scope.id : null,
      reason: null, before: null, after: null }, this.dependencies.now())
  }

  private async authorizeUpload(actor: string, media: StoredMedia): Promise<UploadIntentResult> {
    this.pending(media)
    const seconds = Math.min(300, Math.floor((Date.parse(media.expiresAt) - this.dependencies.now().getTime()) / 1000))
    const upload = await this.dependencies.storage.signUpload(media, seconds)
    await this.dependencies.transaction.run(async (repositories) => {
      this.pending(await this.current(repositories, actor, media.id, 'upload'))
    })
    return { mediaId: media.id, objectKey: media.objectKey, upload }
  }

  private pending(media: StoredMedia) {
    if (media.status !== 'pending_upload' || Date.parse(media.expiresAt) <= this.dependencies.now().getTime() + 1000) {
      throw new DomainError('UPLOAD_INTENT_CLOSED', '上传意图已结束，请重新选择文件上传', 409)
    }
  }

  private newMedia(actor: string, input: UploadIntentBody): StoredMedia {
    const id = randomUUID()
    const target = input.target ?? { type: 'self' as const, id: actor }
    const valid = input.purpose === 'learning' ? target.type === 'platform' && target.id === null
      : input.purpose === 'certification_evidence' ? target.type === 'self' || (target.type === 'organization' && target.id !== null)
      : input.purpose === 'exam_answer' ? target.type === 'attempt' && target.id !== null
      : input.purpose === 'post_game_record' ? target.type === 'match' && target.id !== null
      : input.purpose === 'avatar' ? target.type === 'self' && target.id === actor : target.type === 'self'
    if (!valid) throw hidden()
    const now = this.dependencies.now()
    return { id, ownerUserId: actor, purpose: input.purpose, target, objectKey: `media/${actor}/${id}`,
      status: 'pending_upload', contentType: input.contentType, expectedSizeBytes: input.sizeBytes,
      verifiedSizeBytes: null, etag: null, cleanedAt: null, createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + 900000).toISOString() }
  }
}
