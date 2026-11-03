import { describe, expect, it } from 'vitest'
import { editorialFilters, findEditorial } from '../src/content/editorial'
import { deskResources, discussionStories, featuredStory, learningPreviews } from '../src/views/home/home.presentation'

function expectPublishedAnchor(path: string) {
  const [pathname = '', anchor] = path.split('#')
  const article = findEditorial(pathname.split('/').at(-1)!)
  expect(article).toBeDefined()
  expect(article?.sections.some((section) => section.id === anchor)).toBe(true)
}

describe('内容门户首页的展示投影', () => {
  it('主专题与案头资料分工明确，目录全部指向已有正文锚点', () => {
    expect(featuredStory.id).toBe('observation-angle')
    expect(deskResources.map((article) => article.id)).toEqual(['ruleset-reading', 'pregame-briefing'])
    for (const article of deskResources) {
      expect(article.id).not.toBe(featuredStory.id)
      expect(article.outline.map((section) => section.title)).toEqual(article.sections.map((section) => section.title))
      for (const section of article.outline) expectPublishedAnchor(section.path)
    }
    for (const section of featuredStory.sections) expectPublishedAnchor(`${featuredStory.path}#${section.id}`)
  })

  it('讨论流直接展示真实自编情境，示例回应链接不指向不存在的论坛能力', () => {
    expect(discussionStories).toHaveLength(2)
    for (const article of discussionStories) {
      expect(article.label).toContain('讨论示例')
      expect(article.excerpt).toBe(findEditorial(article.id)?.sections[0]?.paragraphs[0])
      expectPublishedAnchor(`${article.path}#example-response`)
      for (const field of ['author', 'views', 'replies', 'publishedAt']) expect(article).not.toHaveProperty(field)
    }
  })

  it('研读区优先展示规则阅读方法，筛选保留全部匹配内容且不重复', () => {
    expect(learningPreviews('全部').map((article) => article.id)).toEqual(['ruleset-reading', 'pregame-briefing', 'observation-angle'])
    expect(learningPreviews('规则研读').map((article) => article.id)).toEqual(['ruleset-reading'])
    expect(learningPreviews('执裁协作').map((article) => article.id)).toEqual(['pregame-briefing', 'observation-angle'])
    for (const filter of editorialFilters) {
      const articles = learningPreviews(filter)
      expect(new Set(articles.map((article) => article.id)).size).toBe(articles.length)
      expect(articles.every((article) => article.kind === 'guide')).toBe(true)
    }
  })

  it('正文节选来自共享内容，不另维护可能与详情脱节的副本', () => {
    for (const article of learningPreviews('全部')) {
      expect(article.preview).toBe(findEditorial(article.id)?.sections[0])
      expect(article.preview.paragraphs.length).toBeGreaterThanOrEqual(2)
    }
  })
})
