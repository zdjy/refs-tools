export type EditorialCategory = '规则研读' | '执裁协作'
export interface EditorialArticle {
  id: string
  path: string
  kind: 'guide' | 'discussion'
  category: EditorialCategory
  title: string
  summary: string
  label: string
  takeaway: string
  sections: readonly { id: string; title: string; paragraphs: readonly string[] }[]
}

export const editorialArticles = [
  {
    id: 'observation-angle', path: '/read/observation-angle', kind: 'guide', category: '执裁协作', label: '观察与跑位',
    title: '看清接触之前，先看清位置。',
    summary: '从人、球与空间的关系开始，建立一次有依据的回看，而不是只盯着最后一帧。',
    takeaway: '好的复盘，不只问“吹了什么”，也问“当时能看见什么”。',
    sections: [
      { id: 'before-contact', title: '把回放向前推一点', paragraphs: ['接触发生的那一帧，并不包含完整的信息。先回到攻守关系形成之前，观察运动方向、彼此距离，以及视线是否被其他队员遮挡。', '为复盘分别记录“画面中看见的事实”和“仍然无法确认的部分”。不要用慢镜头中新增的视角，倒推现场裁判必然能够看见。'] },
      { id: 'open-angle', title: '寻找能够分离攻守双方的视角', paragraphs: ['距离更近不必然意味着观察更清楚。回看时检查攻守双方是否在视线中重叠，是否能看到接触前的身体关系，以及移动后能否继续保持观察。', '本站球场插图只表达视角与空间的关系，不是两人制或三人制的标准站位图。具体区域责任、轮转与配合，应按所采用的裁判法及赛事要求核对。'] },
      { id: 'review-together', title: '把位置问题带进同伴复盘', paragraphs: ['与同伴分别描述自己当时的观察范围，再讨论哪些信息可以相互补充。先统一事实，再对照适用版本讨论规则，不以谁离球更近作为唯一依据。', '一次复盘可以只形成一个可执行的改进：下一次同类回合，提前识别遮挡、保持开放视角，或在赛前沟通区域交接。'] },
    ],
  },
  {
    id: 'ruleset-reading', path: '/read/ruleset-reading', kind: 'guide', category: '规则研读', label: '规则阅读方法',
    title: '读规则，先确认你读的是哪一个版本。',
    summary: '把规则正文、官方解释与赛事规程放在一起核对，让每一次引用都有清楚的适用范围。',
    takeaway: '先写下来源与版本，再讨论条文怎样适用于具体情境。',
    sections: [
      { id: 'identify-version', title: '先核对适用文件', paragraphs: ['开始研读前，确认赛事采用的竞赛规则、版本、生效日期及补充规程。不同组织、年龄组或比赛形式可能有明确差异，不把某一套参数当作所有比赛的默认值。', '为笔记保留文件名称、发布机构、版本及对应章节。转述和截图应能追溯到原文，而不是只留下一个脱离上下文的结论。'] },
      { id: 'read-context', title: '正文与解释一起读', paragraphs: ['先阅读条文的前提条件、定义与例外，再核对该版本对应的官方解释。把情境拆成可观察事实，逐项检查适用条件，不只记住结果。', '遇到看似矛盾的资料时，先检查版本与适用范围是否一致。不确定之处记为待核对问题，不把自编笔记或社区讨论当作官方解释。'] },
      { id: 'make-notes', title: '用情境组织自己的笔记', paragraphs: ['每条笔记保留四项：情境事实、适用文件、条款依据、尚待确认的信息。遇到相似回合，先比较前提条件，再比较处理结果。', '这篇导读只提供阅读方法，不提供某一规则集的统一罚则。临场判断以赛事采用的有效规则与规程为依据。'] },
    ],
  },
  {
    id: 'pregame-briefing', path: '/read/pregame-briefing', kind: 'guide', category: '执裁协作', label: '赛前准备',
    title: '把赛前沟通，从“都明白”变成具体约定。',
    summary: '从规则版本到计时信号，用一份简短的沟通提纲，把不确定留在开赛之前。',
    takeaway: '最有用的赛前沟通，是让每个人知道出现问题时如何配合。',
    sections: [
      { id: 'shared-context', title: '确认共同的比赛信息', paragraphs: ['与裁判组及记录台核对比赛形式、适用规则版本、赛事补充要求和岗位安排。不要以熟悉场地或过去合作过，代替本场的再次确认。', '核查记录、计时与信号设备的工作状态；如需使用本地工作台，先明确参数与用途。本站本地工作台不自动成为赛事官方记录。'] },
      { id: 'communication', title: '约定信息如何交接', paragraphs: ['针对区域交接、视线遮挡、信息不一致等情境，讨论按所采用裁判法进行配合的方式。沟通应具体到谁先提供哪些事实，而不是笼统地“互相帮忙”。', '与记录台确认沟通渠道、信号确认和出现设备异常时的报告方式。涉及纠正程序与权限时，必须查阅本场适用规则，不自行创造统一处理流程。'] },
      { id: 'after-game', title: '提前约定赛后留痕', paragraphs: ['明确赛后记录的提交人、渠道和所需材料。将现场事实与个人评价分开，按赛事要求记录有必要留痕的事件。', '正式比赛或赛后主记录仍需在所属赛事流程提交。本地工具导出不会自动同步，也不代替组织要求的审核与报告。'] },
    ],
  },
  {
    id: 'contact-review', path: '/read/contact-review', kind: 'discussion', category: '执裁协作', label: '讨论示例 · 判例复盘',
    title: '同一次接触，为什么两个视角会看起来不同？',
    summary: '一个视角看到了身体接触，另一个视角看到了此前的移动。复盘时，我们应该先对齐什么？',
    takeaway: '示例思路：先对齐时间线与可见事实，再讨论适用规则。',
    sections: [
      { id: 'scenario', title: '示例情境', paragraphs: ['一段训练回放中，正面镜头可以看到接触，却无法清楚分辨接触前的脚步；侧面镜头补充了移动过程，但接触点被遮挡。两位参与复盘的人因此给出了不同的初步判断。', '这是为展示讨论结构自编的情境，不对应真实比赛、真实用户或已裁定判例，也没有足够信息支持直接给出罚则结论。'] },
      { id: 'questions', title: '值得先问的三个问题', paragraphs: ['两个镜头是否处于同一时间点？各自能确认哪些身体关系？哪些事实即使组合镜头也无法确认？', '如果引用规则，采用的文件与版本是什么，适用条件是否已经被画面支持？不要用“看起来很明显”跳过这些前提。'] },
      { id: 'example-response', title: '示例回应思路', paragraphs: ['可以先用中性语言写出时间线：移动、位置变化、可见接触、后续动作。分别标明信息来自哪个视角，将不能确认的内容保留为不确定。', '当事实和适用版本清楚后，再讨论条文。真实论坛的发布、回复与审核尚未开放；本页只是一份可阅读的讨论示例。'] },
    ],
  },
  {
    id: 'postgame-notes', path: '/read/postgame-notes', kind: 'discussion', category: '执裁协作', label: '讨论示例 · 执裁手记',
    title: '赛后记录，怎样写事实而不是写情绪？',
    summary: '把“现场很混乱”改写为可核对的时间、行为与处置，让记录更有用。',
    takeaway: '示例思路：可核对的事实，比强烈的形容词更能帮助后续处理。',
    sections: [
      { id: 'scenario', title: '示例情境', paragraphs: ['一次复盘练习中，初稿只有“现场很混乱，对方不配合”。阅读者无法据此确认发生了什么，也不知道记录者已经采取了哪些处理。', '这是自编的表达练习，不是真实用户发帖或真实事件报告。提交真实记录时，内容范围、访问权限及流程应遵循所属组织要求。'] },
      { id: 'facts', title: '用事实替换笼统评价', paragraphs: ['记录必要的时间节点、位置、可观察行为、沟通内容和已经采取的处置。将亲自观察与他人提供的信息分开，无法核实的内容明确标注来源。', '避免推测动机、使用情绪化标签或加入无关个人信息。涉及参与者信息与媒体材料时，按授权范围提交，不在公开讨论中暴露敏感记录。'] },
      { id: 'example-response', title: '示例回应思路', paragraphs: ['可以用“何时、何地、观察到什么、如何处理、还有什么待确认”的顺序重新组织草稿。保留必要信息，删除没有事实支撑的评价。', '本站尚未提供真实社区发布或赛后主记录提交能力。本地工作台仅保存设备上的操作记录，不自动成为正式报告。'] },
    ],
  },
] as const satisfies readonly EditorialArticle[]

export type EditorialId = typeof editorialArticles[number]['id']
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
