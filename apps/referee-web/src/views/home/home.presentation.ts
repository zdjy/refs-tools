import { editorialArticles, filterGuides, type EditorialFilter } from '../../content/editorial'

export const featuredStory = editorialArticles.find((article) => article.id === 'observation-angle')!
export const deskResources = editorialArticles
  .filter((article) => article.kind === 'guide' && article.id !== featuredStory.id)
  .map((article) => ({
    ...article,
    outline: article.sections.map((section) => ({ title: section.title, path: `${article.path}#${section.id}` })),
  }))
export const discussionStories = editorialArticles
  .filter((article) => article.kind === 'discussion')
  .map((article) => ({ ...article, excerpt: article.sections[0].paragraphs[0] }))

/** 优先展示规则阅读方法，避免主专题在研读区再次成为最大内容块；节选直接来自正文。 */
export function learningPreviews(filter: EditorialFilter) {
  const guides = filterGuides(filter)
  return [...guides.filter((article) => article.id !== featuredStory.id), ...guides.filter((article) => article.id === featuredStory.id)]
    .map((article) => ({ ...article, preview: article.sections[0]! }))
}
