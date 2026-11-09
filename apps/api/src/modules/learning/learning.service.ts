import { createHash, randomUUID } from 'node:crypto'
import { Value } from '@sinclair/typebox/value'
import { LearningContentSchema, LearningQuerySchema, LearningRevisionInputSchema, type LearningAsset, type LearningContent,
  type LearningQuery, type LearningRevisionInput } from '@refs-tools/contracts/learning'
import { PageQuerySchema, type PageQuery } from '@refs-tools/contracts/pagination'
import { DomainError } from '../../application/errors.js'
import { learningAccount, learningAudit, learningHidden, learningPermission, learningReferences, learningRevision } from './learning.access.js'
import type { LearningDependencies } from './learning.types.js'

/** 资料正文与媒体/分类引用只追加快照，草稿修订不改变读者当前发布指针。 */
export class LearningService {
  constructor(private readonly d: LearningDependencies) {}

  async create(actor: string, input: LearningContent, key: string) {
    if (!Value.Check(LearningContentSchema, input) || typeof key !== 'string' || !/^[A-Za-z0-9._:-]{1,100}$/.test(key)) throw new DomainError('INVALID_REQUEST', '资料参数或请求键不符合要求', 400)
    const fingerprint = createHash('sha256').update(JSON.stringify([input.title, input.summary, input.body,
      [...input.categoryIds].sort(), [...input.mediaIds].sort(), input.allowDownload])).digest('hex')
    return this.d.transaction.run(async r => {
      await learningPermission(r, this.d, actor)
      await r.learning.lockCategories()
      const previous = await r.learning.findCreation(actor, key)
      if (previous) {
        if (previous.fingerprint !== fingerprint) throw new DomainError('IDEMPOTENCY_CONFLICT', '同一请求键不能创建不同资料', 409)
        return { asset: previous.asset, content: (await r.learning.version(previous.asset.id, 1))! }
      }
      await learningReferences(r, input, actor)
      const asset: LearningAsset = { id: randomUUID(), status: 'draft', revision: 1, latestVersion: 1, publishedVersion: null }
      await r.learning.create(asset, actor, key, fingerprint)
      await r.learning.appendVersion(asset.id, 1, input, actor, this.d.now().toISOString())
      await learningAudit(r, this.d, actor, asset.id, 'learning.versioned', null, asset)
      return { asset, content: (await r.learning.version(asset.id, 1))! }
    })
  }

  async revise(actor: string, id: string, input: LearningRevisionInput) {
    if (!Value.Check(LearningRevisionInputSchema, input)) throw new DomainError('INVALID_REQUEST', '资料参数不符合要求', 400)
    return this.d.transaction.run(async r => {
      await learningPermission(r, this.d, actor)
      await r.learning.lockCategories()
      const before = await r.learning.asset(id)
      if (!before) throw learningHidden()
      learningRevision(before, input.expectedRevision)
      const previous = (await r.learning.version(id, before.latestVersion))!
      await learningReferences(r, input, actor, previous.mediaIds)
      const after = { ...before, latestVersion: before.latestVersion + 1, revision: before.revision + 1 }
      await r.learning.appendVersion(id, after.latestVersion, input, actor, this.d.now().toISOString())
      if (!await r.learning.save(after, before.revision)) throw new DomainError('VERSION_CONFLICT', '资料已更新', 409)
      await learningAudit(r, this.d, actor, id, 'learning.versioned', before, after)
      return { asset: after, content: (await r.learning.version(id, after.latestVersion))! }
    })
  }

  async list(actor: string, query: LearningQuery, management = false) {
    if (!Value.Check(LearningQuerySchema, query)) throw new DomainError('INVALID_REQUEST', '查询参数不符合要求', 400)
    return this.d.transaction.run(async r => {
      await learningAccount(r, actor)
      if (management) await learningPermission(r, this.d, actor)
      return r.learning.list(query, management)
    })
  }

  async detail(actor: string, id: string, management = false) {
    return this.d.transaction.run(async r => {
      await learningAccount(r, actor)
      if (management) await learningPermission(r, this.d, actor)
      const asset = await r.learning.asset(id)
      if (!asset || (!management && asset.status !== 'published')) throw learningHidden()
      const number = management ? asset.latestVersion : asset.publishedVersion!
      return { asset, content: (await r.learning.version(id, number))! }
    })
  }

  async history(actor: string, id: string, query: PageQuery) {
    if (!Value.Check(PageQuerySchema, query)) throw new DomainError('INVALID_REQUEST', '分页参数不符合要求', 400)
    return this.d.transaction.run(async r => {
      await learningPermission(r, this.d, actor)
      if (!await r.learning.asset(id)) throw learningHidden()
      return r.learning.versions(id, query)
    })
  }

  async snapshot(actor: string, id: string, version: number) {
    return this.d.transaction.run(async r => {
      await learningPermission(r, this.d, actor)
      const snapshot = await r.learning.version(id, version)
      if (!snapshot) throw learningHidden()
      return snapshot
    })
  }
}
