import { randomUUID } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { learningHarness } from '../helpers/learning.js'

describe('学习资料版本与发布', () => {
  it('修订追加版本且发布指针保留；下线后编辑可读旧快照而普通读者不可访问', async () => {
    const h = learningHarness()
    await h.publishing.publish(h.actor, h.id, 1, 1)
    await h.service.revise(h.actor, h.id, { ...h.input, title: '新版本', expectedRevision: 2 })
    expect(await h.service.detail(h.actor, h.id)).toMatchObject({ content: { title: '规则导读', version: 1 } })
    expect(await h.service.detail(h.actor, h.id, true)).toMatchObject({ content: { title: '新版本', version: 2 } })
    await expect(h.publishing.publish(h.actor, h.id, 3, 1)).rejects.toMatchObject({ code: 'LEARNING_VERSION_NOT_LATEST' })
    await h.publishing.unpublish(h.actor, h.id, 3)
    await expect(h.service.detail(h.actor, h.id)).rejects.toMatchObject({ statusCode: 404 })
    expect(await h.service.snapshot(h.actor, h.id, 1)).toMatchObject({ title: '规则导读' })
    h.setAllowed(false)
    await expect(h.service.snapshot(h.actor, h.id, 1)).rejects.toMatchObject({ statusCode: 403 })
  })
  it('创建请求键冲突与版本冲突均不覆盖已有快照', async () => {
    const h = learningHarness()
    vi.mocked(h.repositories.learning.findCreation).mockResolvedValue({ asset: (await h.repositories.learning.asset(h.id))!, fingerprint: 'different' })
    await expect(h.service.create(h.actor, h.input, 'same')).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' })
    await expect(h.service.revise(h.actor, h.id, { ...h.input, expectedRevision: 9 })).rejects.toMatchObject({ code: 'VERSION_CONFLICT' })
    expect(h.repositories.learning.appendVersion).not.toHaveBeenCalled()
  })
  it('拒绝未核验/跨用途媒体、跨 owner 新挂载以及停用分类；发布再次检查媒体', async () => {
    const h = learningHarness(), media = h.records.get(h.mediaId)!
    for (const override of [{ status: 'pending_upload' as const }, { purpose: 'certification_evidence' as const }, { ownerUserId: randomUUID() }]) {
      h.records.set(h.mediaId, { ...media, ...override })
      await expect(h.service.create(h.actor, h.input, randomUUID())).rejects.toMatchObject({ code: 'LEARNING_MEDIA_INVALID' })
    }
    h.records.set(h.mediaId, media)
    vi.mocked(h.repositories.learning.activeCategories).mockResolvedValue(false)
    await expect(h.publishing.publish(h.actor, h.id, 1, 1)).rejects.toMatchObject({ code: 'LEARNING_CATEGORY_INVALID' })
    vi.mocked(h.repositories.learning.activeCategories).mockResolvedValue(true)
    h.records.set(h.mediaId, { ...media, status: 'deleted' })
    await expect(h.publishing.publish(h.actor, h.id, 1, 1)).rejects.toMatchObject({ code: 'LEARNING_MEDIA_INVALID' })
  })
  it('空资料不能发布，写入拒绝原始 HTML 字段和无效正文', async () => {
    const h = learningHarness()
    h.versions.set(1, { ...h.versions.get(1)!, body: [], mediaIds: [] })
    await expect(h.publishing.publish(h.actor, h.id, 1, 1)).rejects.toMatchObject({ code: 'LEARNING_CONTENT_REQUIRED' })
    await expect(h.service.create(h.actor, { ...h.input, body: [{ html: '<script>' }] } as never, 'invalid')).rejects.toMatchObject({ statusCode: 400 })
  })
})
