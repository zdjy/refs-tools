import { describe, expect, it } from 'vitest'
import { editorialArticles, findEditorial } from '../src/content/editorial'
import { useThreadFeed } from '../src/views/community/useThreadFeed'
import { createMemoryHistory } from 'vue-router'
import { createAppRouter } from '../src/router'
import { modules } from '../src/navigation/modules'
import { boards, personas, sampleThreads } from '../src/content/threads.sample'
import { boardTabs, communityEntries, communityGuides, threadsByBoard } from '../src/views/community/community.presentation'
import { readingMinutes, threadForArticle } from '../src/views/reading/reading.presentation'

describe('论坛首页的展示与交互', () => {
  it('保留全部六篇导读与已存在的功能入口', () => {
    expect(communityGuides).toEqual(editorialArticles.filter((article) => article.kind === 'guide'))
    expect(communityGuides).toHaveLength(6)
    const router = createAppRouter(createMemoryHistory())
    for (const id of ['workbench', 'gb2312', 'tools', ...communityEntries] as const) expect(router.resolve(modules[id].path).name).not.toBe('not-found')
    expect(communityEntries).toEqual(['learning', 'practice', 'exams', 'certifications', 'organizations', 'events'])
  })

  it('搜索标题、正文和标签，忽略空白，多词交集与版块筛选可以组合', () => {
    expect(threadsByBoard('all', '  ')).toEqual(sampleThreads)
    expect(threadsByBoard('all', '同一次接触').map((thread) => thread.id)).toEqual(['t-contact'])
    expect(threadsByBoard('all', '正面镜头').map((thread) => thread.id)).toEqual(['t-contact'])
    expect(threadsByBoard('all', '事实先行').map((thread) => thread.id)).toEqual(['t-contact'])
    expect(threadsByBoard('case-review', '  接触   视角  ').map((thread) => thread.id)).toEqual(['t-contact'])
    expect(threadsByBoard('field-notes', '正面镜头')).toEqual([])
    expect(threadsByBoard('all', '不存在的关键词')).toEqual([])
  })

  it('重置筛选恢复所有讨论，不丢失已展开的回应，状态不在不同实例间共享', () => {
    const feed = useThreadFeed()
    feed.toggle('t-contact')
    feed.board.value = 'table-work'
    feed.query.value = '无法匹配'
    expect(feed.threads.value).toEqual([])
    feed.reset()
    expect(feed.board.value).toBe('all')
    expect(feed.query.value).toBe('')
    expect(feed.threads.value).toEqual(sampleThreads)
    expect(feed.expanded.value.has('t-contact')).toBe(true)
    expect(useThreadFeed().expanded.value.size).toBe(0)
    feed.toggle('t-contact')
    expect(feed.expanded.value.size).toBe(0)
  })
})

describe('模拟论坛数据的真实性边界', () => {
  it('版块筛选保持顺序，全部版块各自至少有一则讨论', () => {
    expect(threadsByBoard('all')).toEqual(sampleThreads)
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
    for (const item of editorialArticles) expect(readingMinutes(item)).toBeGreaterThanOrEqual(1)
    expect(readingMinutes({ sections: [{ id: 'a', title: 'a', paragraphs: ['字'.repeat(1500)] }] } as never)).toBe(3)
  })
})
