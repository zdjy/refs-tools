import type { EditorialArticle } from '../../content/editorial'
import { sampleThreads } from '../../content/threads.sample'

/** 中文按每分钟约 500 字估算；只是阅读时长参考，不是浏览或完成统计。 */
export function readingMinutes(article: EditorialArticle): number {
  const chars = article.sections.reduce((sum, section) => sum + section.paragraphs.join('').length, 0)
  return Math.max(1, Math.round(chars / 500))
}

/** 讨论示例页底部展示的示例回应；导读没有对应帖子。 */
export function threadForArticle(articleId: string) {
  return sampleThreads.find((thread) => thread.articleId === articleId)
}
