import { createHash, randomUUID } from 'node:crypto'
import { Value } from '@sinclair/typebox/value'
import { LearningCategoryInputSchema, LearningCategoryUpdateSchema, type LearningCategoryInput, type LearningCategoryUpdate } from '@refs-tools/contracts/learning'
import { PageQuerySchema, type PageQuery } from '@refs-tools/contracts/pagination'
import { DomainError } from '../../application/errors.js'
import { learningAccount, learningAudit, learningHidden, learningPermission } from './learning.access.js'
import type { LearningDependencies } from './learning.types.js'

/** 分类最多三级，移动整个子树时同时检查环与后代深度；停用保留历史关联。 */
export class LearningCategoriesService {
  constructor(private readonly d: LearningDependencies) {}

  async list(actor: string, query: PageQuery, management = false) {
    if (!Value.Check(PageQuerySchema, query)) throw new DomainError('INVALID_REQUEST', '分页参数不符合要求', 400)
    return this.d.transaction.run(async r => {
      await learningAccount(r, actor)
      if (management) await learningPermission(r, this.d, actor, 'platform.manage')
      return r.learning.categories(query, management)
    })
  }

  async create(actor: string, input: LearningCategoryInput, key: string) {
    if (typeof key !== 'string' || !/^[A-Za-z0-9._:-]{1,100}$/.test(key)) throw new DomainError('INVALID_REQUEST', '请求键不符合要求', 400)
    return this.change(actor, randomUUID(), input, false, key)
  }

  async update(actor: string, id: string, input: LearningCategoryUpdate) { return this.change(actor, id, input, true) }

  private async change(actor: string, id: string, input: LearningCategoryInput | LearningCategoryUpdate, updating: boolean, key?: string) {
    if (!Value.Check(updating ? LearningCategoryUpdateSchema : LearningCategoryInputSchema, input)) {
      throw new DomainError('INVALID_REQUEST', '分类参数不符合要求', 400)
    }
    return this.d.transaction.run(async r => {
      await learningPermission(r, this.d, actor, 'platform.manage')
      await r.learning.lockCategories()
      const fingerprint = createHash('sha256').update(JSON.stringify([input.parentId, input.name, input.slug, input.status])).digest('hex')
      const previous = key ? await r.learning.categoryCreation(actor, key) : null
      if (previous) {
        if (previous.fingerprint !== fingerprint) throw new DomainError('IDEMPOTENCY_CONFLICT', '同一请求键不能创建不同分类', 409)
        return previous.category
      }
      const current = updating ? await r.learning.category(id) : null
      if (updating && !current) throw learningHidden()
      if (current && current.revision !== (input as LearningCategoryUpdate).expectedRevision) throw new DomainError('VERSION_CONFLICT', '分类已更新', 409)
      const placement = await r.learning.categoryPlacement(input.parentId, updating ? id : undefined)
      if (!placement || placement.cycle || placement.depth + placement.height > 3) {
        throw new DomainError('LEARNING_CATEGORY_DEPTH', '分类最多三级且不能移入自身子树', 422)
      }
      if (!await r.learning.saveCategory(id, input, placement.depth, actor, key, fingerprint)) throw new DomainError('LEARNING_CATEGORY_CONFLICT', '分类标识重复或版本冲突', 409)
      await learningAudit(r, this.d, actor, id, 'learning.category_changed', null, null)
      return (await r.learning.category(id))!
    })
  }
}
