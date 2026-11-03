import type { EditorialId } from './editorial-routes'

/**
 * 模拟论坛数据：全部为随应用发布的自编示例，非真实用户、真实帖子或真实统计。
 * 人物只使用角色称谓；时间使用叙事性描述而非日期；认同数为固定示例值。
 * 真实论坛接入后由受保护 API 提供，见 FS-0011。
 */
export type PersonaId = 'veteran' | 'tablist' | 'rookie' | 'coach' | 'instructor'
export type BoardId = 'case-review' | 'field-notes' | 'table-work' | 'rookie-notes'

export interface SamplePersona {
  id: PersonaId
  name: string
  shape: 'ring' | 'half' | 'dots' | 'bar' | 'step'
}
export interface SampleReply { personaId: PersonaId; moment: string; text: string; helpful: number }
export interface SampleThread {
  id: string
  board: BoardId
  /** 关联完整阅读页；为空表示仅在首页信息流内展示的短帖。 */
  articleId?: EditorialId
  title: string
  body: string
  personaId: PersonaId
  moment: string
  tags: readonly string[]
  helpful: number
  replies: readonly SampleReply[]
}

export const personas: readonly SamplePersona[] = [
  { id: 'veteran', name: '资深主裁 · 示例角色', shape: 'ring' },
  { id: 'tablist', name: '记录台员 · 示例角色', shape: 'bar' },
  { id: 'rookie', name: '新人裁判 · 示例角色', shape: 'dots' },
  { id: 'coach', name: '复盘教练 · 示例角色', shape: 'half' },
  { id: 'instructor', name: '培训讲师 · 示例角色', shape: 'step' },
]

export const boards: readonly { id: BoardId; title: string; hint: string }[] = [
  { id: 'case-review', title: '判例复盘', hint: '把一次回合拆成事实与依据' },
  { id: 'field-notes', title: '执裁手记', hint: '赛后记录与表达练习' },
  { id: 'table-work', title: '记录台协作', hint: '信号、核对与异常报告' },
  { id: 'rookie-notes', title: '新人笔记', hint: '第一个赛季的整理方法' },
]

export const sampleThreads: readonly SampleThread[] = [
  {
    id: 't-contact', board: 'case-review', articleId: 'contact-review', personaId: 'coach', moment: '训练回放复盘课之后',
    title: '同一次接触，为什么两个视角会看起来不同？',
    body: '一段训练回放中，正面镜头可以看到接触，却无法清楚分辨接触前的脚步；侧面镜头补充了移动过程，但接触点被遮挡。',
    tags: ['时间线', '视角', '事实先行'], helpful: 24,
    replies: [
      { personaId: 'veteran', moment: '当晚', text: '我会先把两个镜头对到同一个时间点，再各写一句“能确认”和“不能确认”，然后才翻规则。', helpful: 12 },
      { personaId: 'rookie', moment: '次日', text: '以前总想直接找条文，现在发现先把事实写清楚，条文反而好找了。', helpful: 7 },
    ],
  },
  {
    id: 't-notes', board: 'field-notes', articleId: 'postgame-notes', personaId: 'instructor', moment: '一次表达练习课后',
    title: '赛后记录，怎样写事实而不是写情绪？',
    body: '初稿只有“现场很混乱，对方不配合”。阅读者无法据此确认发生了什么，也不知道记录者已经采取了哪些处理。',
    tags: ['记录', '中性表达'], helpful: 31,
    replies: [
      { personaId: 'tablist', moment: '当晚', text: '从记录台这边看，最有用的是时间点和谁说了什么，形容词反而帮不上忙。', helpful: 15 },
      { personaId: 'coach', moment: '次日', text: '可以用“何时、何地、观察到什么、如何处理、待确认什么”五格来重写一遍。', helpful: 9 },
      { personaId: 'rookie', moment: '两天后', text: '照这个顺序改写后，我的草稿短了一半，信息却更完整。', helpful: 5 },
    ],
  },
  {
    id: 't-mismatch', board: 'table-work', articleId: 'table-mismatch', personaId: 'veteran', moment: '一场练习赛的暂停之后',
    title: '计分显示与自己的记忆不一致，先问什么？',
    body: '一位裁判觉得显示的比分与自己的记忆相差一次得分。双方都不确定是观察遗漏还是记录有误。',
    tags: ['核对', '沟通'], helpful: 18,
    replies: [
      { personaId: 'tablist', moment: '赛后', text: '希望对方先说“我想确认一下”，我们更愿意一起把依据摆出来。', helpful: 11 },
      { personaId: 'instructor', moment: '次日', text: '是否能当场核对、怎么核对，要看本场适用的规则和规程，不要凭习惯。', helpful: 8 },
    ],
  },
  {
    id: 't-season', board: 'rookie-notes', articleId: 'first-season-notes', personaId: 'rookie', moment: '第一个赛季结束时',
    title: '第一个赛季结束，笔记应该留下什么？',
    body: '手里有厚厚一叠比赛笔记，却很难从中找到下一步该练什么。',
    tags: ['赛季复盘', '练习目标'], helpful: 27,
    replies: [
      { personaId: 'coach', moment: '当周', text: '挑三条最有价值的笔记，各写一个下赛季的具体练习目标，能在下一场检验就够了。', helpful: 14 },
    ],
  },
  {
    id: 't-speed', board: 'case-review', personaId: 'coach', moment: '复盘周会前',
    title: '复盘时，你习惯先看慢放还是先看原速？',
    body: '想听听大家的顺序。我自己的做法是原速一遍、慢放一遍，两次分开记录。',
    tags: ['复盘方法'], helpful: 9,
    replies: [
      { personaId: 'veteran', moment: '当天', text: '先原速，建立当时的整体印象；再慢放核对细节，别让慢放覆盖掉现场感受。', helpful: 6 },
      { personaId: 'rookie', moment: '次日', text: '我是反过来的，结果总把慢放里新增的信息当成当时就能看到的。', helpful: 4 },
    ],
  },
  {
    id: 't-ten', board: 'field-notes', personaId: 'instructor', moment: '一场比赛结束后',
    title: '赛后十分钟，你会先写什么？',
    body: '记忆会很快被后来的讨论改写。你有没有固定的“先留下来”的三件事？',
    tags: ['赛后', '记忆'], helpful: 13,
    replies: [
      { personaId: 'veteran', moment: '当晚', text: '时间节点、相关人员的位置、我当时做了什么。其余的等冷静后再补。', helpful: 8 },
    ],
  },
  {
    id: 't-opening', board: 'table-work', personaId: 'tablist', moment: '赛前准备时',
    title: '赛前和记录台沟通，最容易被忽略的一句是什么？',
    body: '我们常默认“你知道怎么做”。你们有没有哪一句话，说出来就能省下很多场上的麻烦？',
    tags: ['赛前沟通', '确认方式'], helpful: 16,
    replies: [
      { personaId: 'veteran', moment: '当天', text: '“你希望我用什么方式确认收到？”问一句，比猜强。', helpful: 10 },
      { personaId: 'instructor', moment: '次日', text: '补一句：设备出问题时，先告诉谁、怎么告诉。', helpful: 6 },
    ],
  },
  {
    id: 't-eve', board: 'rookie-notes', personaId: 'rookie', moment: '执裁前一晚',
    title: '第一次执裁前一晚，你会准备什么？',
    body: '我列了装备和路线，但总觉得漏了什么。想听听过来人的清单。',
    tags: ['准备', '心态'], helpful: 20,
    replies: [
      { personaId: 'veteran', moment: '当晚', text: '把适用规程再读一遍，并写下三个想和同伴确认的问题。', helpful: 12 },
      { personaId: 'coach', moment: '次日', text: '早点休息。规则没记全可以查，状态不好却补不回来。', helpful: 9 },
    ],
  },
]

export function findPersona(id: PersonaId): SamplePersona {
  return personas.find((persona) => persona.id === id)!
}
