import { describe, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import { createAppRouter } from '../src/router'
import { editorialArticles, editorialFilters, editorialNotice, filterGuides, findEditorial } from '../src/content/editorial'

const router = createAppRouter(createMemoryHistory())

describe('内置公开内容与阅读导航', () => {
  it('只筛选自编导读，不把讨论示例混入学习资料', () => {
    expect(filterGuides('全部').map((item) => item.id)).toEqual(['observation-angle', 'ruleset-reading', 'pregame-briefing'])
    expect(filterGuides('规则研读').map((item) => item.id)).toEqual(['ruleset-reading'])
    expect(filterGuides('执裁协作').map((item) => item.id)).toEqual(['observation-angle', 'pregame-briefing'])
    for (const filter of editorialFilters) expect(filterGuides(filter).every((item) => item.kind === 'guide')).toBe(true)
    expect(filterGuides('全部')).toHaveLength(3)
  })

  it('每篇都有唯一稳定路径、完整正文与唯一目录锚点', () => {
    expect(new Set(editorialArticles.map((item) => item.id)).size).toBe(5)
    expect(new Set(editorialArticles.map((item) => item.path)).size).toBe(5)
    for (const article of editorialArticles) {
      expect(article.path).toBe(`/read/${article.id}`)
      expect(findEditorial(article.id)).toBe(article)
      expect(article.sections).toHaveLength(3)
      expect(new Set(article.sections.map((section) => section.id)).size).toBe(article.sections.length)
      for (const section of article.sections) {
        expect(section.title.length).toBeGreaterThan(0)
        expect(section.paragraphs.length).toBeGreaterThanOrEqual(2)
      }
    }
    expect(findEditorial('missing')).toBeUndefined()
  })

  it('五条显式阅读路由懒加载，未知 slug 仍为 404', () => {
    for (const article of editorialArticles) {
      const route = router.resolve(article.path)
      expect(route.name).toBe(`read-${article.id}`)
      expect(route.meta.title).toBeTruthy()
      expect(route.meta.navigation).toBe(article.kind === 'guide' ? 'learning' : 'forum')
      expect(route.matched[0]?.props.default).toEqual({ articleId: article.id })
      expect(typeof route.matched[0]?.components?.default).toBe('function')
    }
    for (const path of ['/read/missing', '/read', '/read/contact-review/reply']) expect(router.resolve(path).name).toBe('not-found')
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

  it('讨论始终标记示例，没有真实用户与热度字段', () => {
    const discussions = editorialArticles.filter((item) => item.kind === 'discussion')
    expect(discussions).toHaveLength(2)
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
