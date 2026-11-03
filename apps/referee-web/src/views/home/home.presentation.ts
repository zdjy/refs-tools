import { editorialArticles, filterGuides, type EditorialFilter } from '../../content/editorial'
import { boards, sampleThreads, type BoardId } from '../../content/threads.sample'

export const featuredStory = editorialArticles.find((article) => article.id === 'observation-angle')!

/** Hero 下方滚动的关键词，全部取自导读主题，不含统计或排行。 */
export const keywordBand = ['位置与视角', '规则版本', '赛前沟通', '记录台信号', '术语核对', '场上表达', '赛后留痕', '复盘方法'] as const

/** 目录索引：编号来自内容顺序，不表示热度或推荐排名。 */
export const articleIndex = editorialArticles.map((article, index) => ({
  ...article,
  number: String(index + 1).padStart(2, '0'),
  kindLabel: article.kind === 'guide' ? '导读' : '讨论示例',
}))

/** 导读横轨：排除主专题，避免与 Hero 重复。 */
export const guideRail = editorialArticles.filter((article) => article.kind === 'guide' && article.id !== featuredStory.id)

/** 优先展示规则阅读方法，避免主专题在研读区再次成为最大内容块；节选直接来自正文。 */
export function learningPreviews(filter: EditorialFilter) {
  const guides = filterGuides(filter)
  return [...guides.filter((article) => article.id !== featuredStory.id), ...guides.filter((article) => article.id === featuredStory.id)]
    .map((article) => ({ ...article, preview: article.sections[0]! }))
}

/** 论坛信息流按版块筛选；'all' 保持内容原顺序。 */
export function threadsByBoard(board: BoardId | 'all') {
  return board === 'all' ? sampleThreads : sampleThreads.filter((thread) => thread.board === board)
}

export const boardTabs = [{ id: 'all' as const, title: '全部', hint: '所有示例讨论' }, ...boards]

export const glossary = [
  { term: '适用版本', note: '规则正文、官方解释与赛事规程各自有版本与生效日期，引用前先核对。' },
  { term: '事实与判断', note: '先写看到了什么，再写据此作出了什么判断，两者分开记录。' },
  { term: '待核对', note: '无法当场确认的信息，如实记为待核对，不用推测补全。' },
  { term: '确认方式', note: '与同伴约定“收到”如何表达，比默认对方明白更可靠。' },
  { term: '中性表达', note: '描述行为与时间，避免动机推测与情绪化标签。' },
  { term: '赛后留痕', note: '按赛事要求，把有必要留下的事件写成可核对的记录。' },
] as const
