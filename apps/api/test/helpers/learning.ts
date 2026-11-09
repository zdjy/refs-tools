import { randomUUID } from 'node:crypto'
import { vi } from 'vitest'
import type { LearningAsset, LearningCategory, LearningContent, LearningVersion } from '@refs-tools/contracts/learning'
import type { LearningDependencies, LearningRepositories } from '../../src/modules/learning/learning.types.js'
import { LearningService } from '../../src/modules/learning/learning.service.js'
import { LearningCategoriesService } from '../../src/modules/learning/learning-categories.service.js'
import { LearningPublishingService } from '../../src/modules/learning/learning-publishing.service.js'
import { LearningMediaService } from '../../src/modules/learning/learning-media.service.js'
import { mediaHarness } from './media.js'

/** 用例测试只替换持久化端口，不替换 Service 或策略；SQL 和并发由独立 PostgreSQL 测试验证。 */
export function learningHarness() {
  const h = mediaHarness(), id = randomUUID(), mediaId = randomUUID()
  let record: LearningAsset = { id, status: 'draft', revision: 1, latestVersion: 1, publishedVersion: null }
  const input: LearningContent = { title: '规则导读', summary: '学习资料', body: [{ text: '规则说明' }], categoryIds: [], mediaIds: [mediaId], allowDownload: false }
  const versions = new Map<number, LearningVersion>([[1, { ...input, assetId: id, version: 1, createdBy: h.actor, createdAt: h.dependencies.now().toISOString() }]])
  const category: LearningCategory = { id: randomUUID(), parentId: null, name: '规则', slug: 'rules', depth: 1, status: 'active', revision: 1 }
  const repositories: LearningRepositories = { ...h.repositories, learning: {
    categoryCreation: vi.fn(async () => null), recordPublication: vi.fn(async () => {}),
    lockCategories: vi.fn(async () => {}), category: vi.fn(async () => category), categories: vi.fn(async () => ({ items: [category], total: 1, page: 1, pageSize: 20 })),
    categoryPlacement: vi.fn(async () => ({ depth: 1, height: 0, cycle: false })), saveCategory: vi.fn(async () => true), activeCategories: vi.fn(async () => true),
    create: vi.fn(async created => { record = created; return true }), findCreation: vi.fn(async () => null),
    asset: vi.fn(async () => ({ ...record })), version: vi.fn(async (_id, number) => versions.get(number) ?? null),
    versions: vi.fn(async () => ({ items: [...versions.values()], total: versions.size, page: 1, pageSize: 20 })),
    list: vi.fn(async () => ({ items: [], total: 0, page: 1, pageSize: 20 })),
    appendVersion: vi.fn(async (assetId, number, content, createdBy, createdAt) => { versions.set(number, { title: content.title, summary: content.summary,
      body: content.body, categoryIds: content.categoryIds, mediaIds: content.mediaIds, allowDownload: content.allowDownload, assetId, version: number, createdBy, createdAt }) }),
    save: vi.fn(async updated => { record = updated; return true }),
  } }
  let allowed = true, inside = false
  const d: LearningDependencies = { permissions: { isPermitted: () => allowed }, now: h.dependencies.now,
    transaction: { async run(work) { inside = true; try { return await work(repositories) } finally { inside = false } } },
    storage: { ...h.dependencies.storage, signRead: vi.fn(async () => {
      if (inside) throw new Error('事务内签名')
      return { url: 'https://storage.example/read', expiresAt: '2026-11-04T00:01:00.000Z' }
    }) } }
  h.records.set(mediaId, { id: mediaId, ownerUserId: h.actor, purpose: 'learning', target: { type: 'platform', id: null }, status: 'available',
    contentType: 'application/pdf', expectedSizeBytes: 10, verifiedSizeBytes: 10, etag: 'e', cleanedAt: null, objectKey: 'private-key',
    createdAt: '2026-11-04T00:00:00.000Z', expiresAt: '2026-11-04T00:15:00.000Z' })
  return { ...h, id, mediaId, input, versions, category, repositories, dependencies: d,
    service: new LearningService(d), categories: new LearningCategoriesService(d), publishing: new LearningPublishingService(d), media: new LearningMediaService(d),
    setRecord(value: Partial<LearningAsset>) { record = { ...record, ...value } }, setAllowed(value: boolean) { allowed = value } }
}
