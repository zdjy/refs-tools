import type { EditorialArticle } from './editorial.types'

export const extraDiscussions: readonly EditorialArticle[] = [
  {
    id: 'table-mismatch', path: '/read/table-mismatch', kind: 'discussion', category: '执裁协作', label: '讨论示例 · 记录台协作', motif: 'mismatch',
    title: '计分显示与自己的记忆不一致，先问什么？',
    summary: '一次练习赛中，裁判的印象与记录台的显示出现了差别。怎样提问，才不会变成对立？',
    takeaway: '示例思路：先对齐各自的信息来源，再讨论如何核对。',
    sections: [
      { id: 'scenario', title: '示例情境', paragraphs: ['练习赛的某个暂停之后，一位裁判觉得显示的比分与自己的记忆相差一次得分。双方都不确定是观察遗漏还是记录有误。', '这是自编情境，不对应真实比赛或真实人员。是否允许、如何进行核对，取决于本场适用的规则与赛事规程。'] },
      { id: 'questions', title: '先问这三个问题', paragraphs: ['我的信息来自哪里，是亲眼看到还是依赖记忆？对方的记录依据是什么？有没有第三个可以核对的来源？', '用“我想确认一下”开头，比“你记错了”更能让对方回到事实本身。'] },
      { id: 'example-response', title: '示例回应思路', paragraphs: ['先把差异说清楚：我记得的是什么、显示的是什么、差在哪里。再询问对方是否可以按照赛事规定的方式核对。', '真实论坛的发布与回复尚未开放；本页仅是一份讨论示例，具体处理方式以适用规则为准。'] },
    ],
  },
  {
    id: 'first-season-notes', path: '/read/first-season-notes', kind: 'discussion', category: '规则研读', label: '讨论示例 · 新人笔记', motif: 'steps',
    title: '第一个赛季结束，笔记应该留下什么？',
    summary: '与其记很多，不如留下三类能指导下一次执裁的信息。',
    takeaway: '示例思路：记录下一次能用上的东西，而不是全部发生过的事。',
    sections: [
      { id: 'scenario', title: '示例情境', paragraphs: ['一位刚完成第一个赛季的新人，手里有厚厚一叠比赛笔记，却很难从中找到下一步该练什么。', '这是自编情境，不是真实用户的发帖。笔记的内容与保存方式，请遵循所属组织对资料的管理要求。'] },
      { id: 'what-to-keep', title: '值得保留的三类信息', paragraphs: ['一类是反复出现的情境，一类是自己当时的观察范围与决定依据，一类是同伴给出的具体建议。', '情绪性的评价与对个人的评论，通常不需要保留；确需记录的事实，应尽量写成可核对的描述。'] },
      { id: 'example-response', title: '示例回应思路', paragraphs: ['可以每个赛季末挑出三条最有价值的笔记，各写一个下赛季的练习目标。这些目标不需要覆盖所有问题，只需要足够具体，能够在下一场比赛中检验。', '真实社区的发布与回复暂未开放，本页仅为讨论示例。'] },
    ],
  },
]
