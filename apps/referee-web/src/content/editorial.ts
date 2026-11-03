import { coreDiscussions } from './discussions-core'
import { extraDiscussions } from './discussions-extra'
import { coreGuides } from './guides-core'
import { extraGuides } from './guides-extra'
import type { EditorialArticle } from './editorial.types'

export type { EditorialArticle, EditorialCategory, EditorialSection, CoverMotif } from './editorial.types'
export type { EditorialId, EditorialKind } from './editorial-routes'

/** 顺序即首页索引顺序：先导读，后讨论示例。 */
export const editorialArticles: readonly EditorialArticle[] = [
  ...coreGuides, ...extraGuides, ...coreDiscussions, ...extraDiscussions,
]

export const editorialFilters = ['全部', '规则研读', '执裁协作'] as const
export type EditorialFilter = typeof editorialFilters[number]
export const editorialNotice = '本站自编导读与讨论示例，不是官方规则解释；请核对本场适用规则版本与赛事规程。'

/** 筛选随应用发布的公开导读，不代表服务端学习资料或个人学习记录。 */
export function filterGuides(filter: EditorialFilter): readonly EditorialArticle[] {
  return editorialArticles.filter((article) => article.kind === 'guide' && (filter === '全部' || article.category === filter))
}

/** 返回显式路由绑定的内置文章；未知内容不回退到任意文章。 */
export function findEditorial(id: string): EditorialArticle | undefined {
  return editorialArticles.find((article) => article.id === id)
}

/** 同类型文章中的下一篇，到末尾回绕；用于阅读页底部续读，不记录阅读历史。 */
export function nextEditorial(id: string): EditorialArticle | undefined {
  const current = findEditorial(id)
  if (!current) return undefined
  const peers = editorialArticles.filter((article) => article.kind === current.kind)
  return peers[(peers.indexOf(current) + 1) % peers.length]
}
