import type { EditorialId, EditorialKind } from './editorial-routes'

export type EditorialCategory = '规则研读' | '执裁协作'

/** 封面插图的图形母题；仅决定自绘 SVG 的构图，不携带业务含义。 */
export type CoverMotif =
  | 'sightline' | 'ruleset' | 'briefing' | 'table' | 'terms' | 'speech'
  | 'overlap' | 'notes' | 'mismatch' | 'steps'

export interface EditorialSection {
  id: string
  title: string
  paragraphs: readonly string[]
}

export interface EditorialArticle {
  id: EditorialId
  path: string
  kind: EditorialKind
  category: EditorialCategory
  title: string
  summary: string
  label: string
  takeaway: string
  motif: CoverMotif
  sections: readonly EditorialSection[]
}
