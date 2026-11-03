import { describe, expect, it } from 'vitest'
import { editorialFilters, findEditorial } from '../src/content/editorial'
import { boards, personas, sampleThreads } from '../src/content/threads.sample'
import { articleIndex, boardTabs, featuredStory, glossary, guideRail, keywordBand, learningPreviews, threadsByBoard } from '../src/views/home/home.presentation'
import { readingMinutes, threadForArticle } from '../src/views/reading/reading.presentation'

describe('内容门户首页的展示投影', () => {
  it('索引覆盖全部文章，编号连续且与内容顺序一致', () => {
    expect(articleIndex).toHaveLength(10)
    expect(articleIndex.map((item) => item.number)).toEqual(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'])
    expect(articleIndex.filter((item) => item.kindLabel === '讨论示例').every((item) => item.kind === 'discussion')).toBe(true)
  })

  it('导读横轨排除主专题，避免与 Hero 重复', () => {
    expect(featuredStory.id).toBe('observation-angle')
    expect(guideRail.map((item) => item.id)).not.toContain(featuredStory.id)
    expect(guideRail.every((item) => item.kind === 'guide')).toBe(true)
    expect(guideRail).toHaveLength(5)
  })

  it('研读筛选优先规则阅读方法，结果不重复且节选来自共享正文', () => {
    expect(learningPreviews('规则研读').map((item) => item.id)).toEqual(['ruleset-reading', 'terminology-check'])
    for (const filter of editorialFilters) {
      const articles = learningPreviews(filter)
      expect(new Set(articles.map((item) => item.id)).size).toBe(articles.length)
      for (const item of articles) expect(item.preview).toBe(findEditorial(item.id)?.sections[0])
    }
  })

  it('关键词带与词汇表非空，词汇不重复', () => {
    expect(keywordBand.length).toBeGreaterThanOrEqual(6)
    expect(glossary).toHaveLength(6)
    expect(new Set(glossary.map((item) => item.term)).size).toBe(glossary.length)
  })
})

describe('模拟论坛数据的真实性边界', () => {
  it('版块筛选保持顺序，全部版块各自至少有一则讨论', () => {
    expect(threadsByBoard('all')).toBe(sampleThreads)
    expect(boardTabs[0]?.id).toBe('all')
    for (const board of boards) {
      const threads = threadsByBoard(board.id)
      expect(threads.length).toBeGreaterThan(0)
      expect(threads.every((thread) => thread.board === board.id)).toBe(true)
    }
  })

  it('关联完整阅读页的帖子都指向讨论示例，且首页帖子标题与文章一致', () => {
    const linked = sampleThreads.filter((thread) => thread.articleId)
    expect(linked.map((thread) => thread.articleId)).toEqual(['contact-review', 'postgame-notes', 'table-mismatch', 'first-season-notes'])
    for (const thread of linked) {
      const article = findEditorial(thread.articleId!)
      expect(article?.kind).toBe('discussion')
      expect(thread.title).toBe(article?.title)
      expect(threadForArticle(thread.articleId!)).toBe(thread)
    }
    expect(threadForArticle('observation-angle')).toBeUndefined()
  })

  it('人物全部是示例角色，只有角色称谓，没有姓名、头像地址或联系方式', () => {
    expect(personas.every((persona) => persona.name.endsWith('示例角色'))).toBe(true)
    for (const persona of personas) {
      for (const key of ['avatar', 'avatarUrl', 'email', 'userId', 'nickname']) expect(persona).not.toHaveProperty(key)
    }
    const ids = new Set(personas.map((persona) => persona.id))
    for (const thread of sampleThreads) {
      expect(ids.has(thread.personaId)).toBe(true)
      for (const reply of thread.replies) expect(ids.has(reply.personaId)).toBe(true)
    }
  })

  it('帖子不含真实时间戳、浏览量或排名字段，时间只有叙事描述', () => {
    for (const thread of sampleThreads) {
      for (const key of ['views', 'publishedAt', 'createdAt', 'rank', 'hot', 'pinned']) expect(thread).not.toHaveProperty(key)
      expect(thread.moment).not.toMatch(/\d{4}[-/年]|\d{1,2}:\d{2}/)
      expect(thread.replies.length).toBeGreaterThan(0)
    }
  })
})

describe('阅读页展示投影', () => {
  it('阅读时长至少 1 分钟，按中文字数估算', () => {
    for (const item of articleIndex) expect(readingMinutes(item)).toBeGreaterThanOrEqual(1)
    expect(readingMinutes({ sections: [{ id: 'a', title: 'a', paragraphs: ['字'.repeat(1500)] }] } as never)).toBe(3)
  })
})
