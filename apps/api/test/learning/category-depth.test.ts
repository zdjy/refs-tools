import { describe, expect, it, vi } from 'vitest'
import { learningHarness } from '../helpers/learning.js'

describe('学习分类', () => {
  it('拒绝第四层、循环与移动后超过三级的子树', async () => {
    const h = learningHarness(), input = { name: '规则', slug: 'rules', parentId: h.category.id, status: 'active' as const }
    for (const placement of [{ depth: 4, height: 0, cycle: false }, { depth: 2, height: 0, cycle: true }, { depth: 2, height: 2, cycle: false }]) {
      vi.mocked(h.repositories.learning.categoryPlacement).mockResolvedValue(placement)
      await expect(h.categories.create(h.actor, input, 'category')).rejects.toMatchObject({ code: 'LEARNING_CATEGORY_DEPTH' })
    }
    expect(h.repositories.learning.saveCategory).not.toHaveBeenCalled()
  })
  it('管理员可维护三级分类，停用不删除历史关联', async () => {
    const h = learningHarness()
    vi.mocked(h.repositories.learning.categoryPlacement).mockResolvedValue({ depth: 3, height: 0, cycle: false })
    const { parentId, name, slug } = h.category
    await h.categories.update(h.actor, h.category.id, { parentId, name, slug, expectedRevision: 1, status: 'disabled' })
    expect(h.repositories.learning.saveCategory).toHaveBeenCalledWith(h.category.id, expect.objectContaining({ status: 'disabled' }), 3, h.actor, undefined, expect.any(String))
  })
  it('拒绝过期 revision、普通用户写入及未验证账号写入', async () => {
    const h = learningHarness(), { parentId, name, slug, status } = h.category
    await expect(h.categories.update(h.actor, h.category.id, { parentId, name, slug, status, expectedRevision: 2 })).rejects.toMatchObject({ code: 'VERSION_CONFLICT' })
    h.setAllowed(false)
    await expect(h.categories.create(h.actor, { parentId, name, slug, status }, 'denied')).rejects.toMatchObject({ statusCode: 403 })
    h.setAllowed(true); h.setVerified(false)
    await expect(h.categories.create(h.actor, { parentId, name, slug, status }, 'unverified')).rejects.toMatchObject({ code: 'EMAIL_NOT_VERIFIED' })
    await expect(h.categories.list(h.actor, {})).resolves.toHaveProperty('total', 1)
  })
})
