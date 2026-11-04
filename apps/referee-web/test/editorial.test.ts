import { describe, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import { createAppRouter } from '../src/router'
import { editorialRoutes } from '../src/content/editorial-routes'
import { editorialArticles, editorialFilters, editorialNotice, filterGuides, findEditorial, nextEditorial } from '../src/content/editorial'

const router = createAppRouter(createMemoryHistory())
const guideIds = ['observation-angle', 'ruleset-reading', 'pregame-briefing', 'tablework-signals', 'terminology-check', 'court-communication']
const discussionIds = ['contact-review', 'postgame-notes', 'table-mismatch', 'first-season-notes']

describe('内置公开内容与阅读导航', () => {
  it('只筛选自编导读，不把讨论示例混入学习资料', () => {
    expect(filterGuides('全部').map((item) => item.id)).toEqual(guideIds)
    expect(filterGuides('规则研读').map((item) => item.id)).toEqual(['ruleset-reading', 'terminology-check'])
    for (const filter of editorialFilters) expect(filterGuides(filter).every((item) => item.kind === 'guide')).toBe(true)
  })

  it('路由元信息与完整注册表一一对应，路径唯一稳定', () => {
    expect(editorialArticles.map((item) => item.id)).toEqual([...guideIds, ...discussionIds])
    expect(editorialRoutes.map((item) => item.id)).toEqual(editorialArticles.map((item) => item.id))
    expect(new Set(editorialArticles.map((item) => item.path)).size).toBe(editorialArticles.length)
    for (const article of editorialArticles) {
      expect(article.path).toBe(`/read/${article.id}`)
      expect(findEditorial(article.id)).toBe(article)
      expect(editorialRoutes.find((item) => item.id === article.id)?.kind).toBe(article.kind)
      expect(article.sections).toHaveLength(3)
      expect(new Set(article.sections.map((section) => section.id)).size).toBe(3)
      for (const section of article.sections) expect(section.paragraphs.length).toBeGreaterThanOrEqual(2)
    }
    expect(findEditorial('missing')).toBeUndefined()
  })

  it('每篇阅读路由显式懒加载，未知 slug 仍为 404', () => {
    for (const article of editorialArticles) {
      const route = router.resolve(article.path)
      expect(route.name).toBe(`read-${article.id}`)
      expect(route.meta.title).toBeTruthy()
      expect(route.meta.navigation).toBe(article.kind === 'guide' ? 'learning' : 'community')
      expect(route.matched[0]?.props.default).toEqual({ articleId: article.id })
      expect(typeof route.matched[0]?.components?.default).toBe('function')
    }
    for (const path of ['/read/missing', '/read', '/read/contact-review/reply']) expect(router.resolve(path).name).toBe('not-found')
  })

  it('续读只在同类型内回绕，不指向自身', () => {
    for (const article of editorialArticles) {
      const next = nextEditorial(article.id)
      expect(next?.kind).toBe(article.kind)
      expect(next?.id).not.toBe(article.id)
    }
    expect(nextEditorial('court-communication')?.id).toBe('observation-angle')
    expect(nextEditorial('first-season-notes')?.id).toBe('contact-review')
    expect(nextEditorial('missing')).toBeUndefined()
  })

  it('阅读目录定位到真实锚点并保留滚动留白，未知锚点回到顶部', () => {
    const anchor = {} as HTMLElement
    const getElementById = vi.fn().mockReturnValue(anchor)
    vi.stubGlobal('document', { getElementById })
    vi.stubGlobal('getComputedStyle', () => ({ scrollMarginTop: '24px' }))
    try {
      const to = { ...router.resolve('/read/ruleset-reading#identify-version'), name: 'read-ruleset-reading' }
      expect(router.options.scrollBehavior?.(to, to, null)).toEqual({ el: anchor, top: 24 })
      expect(getElementById).toHaveBeenCalledWith('identify-version')
      getElementById.mockReturnValue(null)
      expect(router.options.scrollBehavior?.(to, to, null)).toEqual({ top: 0 })
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('讨论始终标记示例，文章对象没有真实用户与热度字段', () => {
    const discussions = editorialArticles.filter((item) => item.kind === 'discussion')
    expect(discussions.map((item) => item.id)).toEqual(discussionIds)
    for (const article of discussions) {
      expect(article.label).toContain('讨论示例')
      expect(article.sections.flatMap((section) => section.paragraphs).join('')).toContain('自编')
    }
    for (const article of editorialArticles) {
      for (const key of ['author', 'views', 'replies', 'publishedAt', 'progress', 'userId']) expect(article).not.toHaveProperty(key)
    }
    expect(editorialNotice).toContain('不是官方规则解释')
    expect(editorialNotice).toContain('适用规则版本')
  })
})
