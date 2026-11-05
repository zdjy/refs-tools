import { editorialArticles } from '../../content/editorial'
import { boards, sampleThreads, type BoardId } from '../../content/threads.sample'

export const boardTabs = [{ id: 'all' as const, title: '全部讨论', hint: '浏览所有讨论示例' }, ...boards]
export const communityGuides = editorialArticles.filter((article) => article.kind === 'guide')
export const communityEntries = ['learning', 'practice', 'exams', 'certifications', 'organizations', 'events'] as const

/** 仅在内置讨论中检索标题、正文与标签；多词查询要求每个词均匹配，维持原有编排顺序。 */
export function threadsByBoard(board: BoardId | 'all', query = '') {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  return sampleThreads.filter((thread) => {
    if (board !== 'all' && thread.board !== board) return false
    const text = [thread.title, thread.body, ...thread.tags].join(' ').toLocaleLowerCase()
    return terms.every((term) => text.includes(term))
  })
}

/** 各版块的内置讨论数量（含「全部」），供版块抽屉显示；数字来自数据本身，不手写。 */
export function boardCounts(): Record<BoardId | 'all', number> {
  const counts: Record<BoardId | 'all', number> = { all: sampleThreads.length, 'case-review': 0, 'field-notes': 0, 'table-work': 0, 'rookie-notes': 0 }
  for (const thread of sampleThreads) counts[thread.board] += 1
  return counts
}
