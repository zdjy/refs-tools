import type { EditorialArticle } from './editorial.types'

export const extraGuides: readonly EditorialArticle[] = [
  {
    id: 'tablework-signals', path: '/read/tablework-signals', kind: 'guide', category: '执裁协作', label: '记录台协作', motif: 'table',
    title: '与记录台之间，信号要先说好再使用。',
    summary: '从确认方式到异常报告，整理一份与记录台协作时值得提前对齐的清单。',
    takeaway: '信号是否有效，取决于双方是否用同一种方式确认。',
    sections: [
      { id: 'agree-confirmation', title: '先约定“收到”怎么表达', paragraphs: ['同一个手势，在不同场地、不同合作对象之间可能被理解为不同含义。开赛前与记录台说明哪些信息需要明确确认，以及确认采用眼神、手势还是其他方式。', '约定的内容以本场适用的规则与赛事要求为准。本篇只提供沟通结构，不规定任何信号的统一含义。'] },
      { id: 'report-anomaly', title: '设备或记录出现异常时', paragraphs: ['先说明自己观察到的现象，再说明需要对方核对什么，避免一上来就下结论。例如“我看到的计时与显示不一致”比“你的计时错了”更容易得到清晰回应。', '异常的处理程序与权限由所采用的规则决定。无法确认时，把问题记为待核对，并按赛事要求向有权处理的人员报告。'] },
      { id: 'leave-a-trace', title: '把处理过程留下痕迹', paragraphs: ['赛后用中性语言记录：何时发现、看到什么、与谁沟通、如何处理、结果是什么。区分亲自观察与他人转述。', '本地工作台的记录只保存在当前设备，不会自动同步，也不会成为正式的赛事记录。'] },
    ],
  },
  {
    id: 'terminology-check', path: '/read/terminology-check', kind: 'guide', category: '规则研读', label: '术语与表达', motif: 'terms',
    title: '同一个词，在不同文件里可能不是同一件事。',
    summary: '用一张小表格记录术语的出处、定义与适用范围，减少沟通中的错位。',
    takeaway: '遇到争论，先问双方说的是不是同一个定义。',
    sections: [
      { id: 'one-term-one-source', title: '一个术语，对应一个出处', paragraphs: ['记录术语时同时写下出处文件、版本与章节。同一个中文词语可能对应不同文件中的不同表述，也可能在翻译中产生差异。', '如果两份资料给出了不同说法，不急于判定谁对谁错，先分别标注来源与适用范围，再向有权解释的机构核对。'] },
      { id: 'spoken-vs-written', title: '口头说法与书面条文分开', paragraphs: ['场上和培训中常用的简称、行话，未必与书面条文的措辞一致。复盘时先用书面条文的措辞复述，再补充口头说法。', '这样做的目的是让同伴能够追溯依据，而不是否定行话本身。'] },
      { id: 'keep-a-glossary', title: '给自己建一张小词表', paragraphs: ['每条记录四栏：术语、出处与版本、一句话定义、容易混淆的相近术语。每次发现新的歧义时补一行，不追求一次建成。', '词表只是个人学习工具，不代表官方定义；正式场合以赛事采用的文件为准。'] },
    ],
  },
  {
    id: 'court-communication', path: '/read/court-communication', kind: 'guide', category: '执裁协作', label: '沟通表达', motif: 'speech',
    title: '场上沟通的语言，越短越要先想清楚。',
    summary: '说明决定、回应质疑与提醒同伴时，如何用最少的话说清事实。',
    takeaway: '简短不等于含糊：先事实，后结论，再说明下一步。',
    sections: [
      { id: 'facts-first', title: '先说看到的，再说判断', paragraphs: ['需要解释时，用一句话描述所观察到的事实，再说明依据的规则类别。把事实与判断拆开，对方更容易理解你的出发点。', '具体的措辞与可沟通的范围，受赛事要求与组织规程限制，本篇不提供统一话术。'] },
      { id: 'stay-steady', title: '面对质疑时保持节奏', paragraphs: ['回应之前先确认对方想问的是什么，必要时复述一次问题。语速与音量保持稳定，避免在情绪升高时增加新的信息。', '如果问题超出了当场可以解释的范围，说明这一点，并告知可以通过什么渠道继续了解。'] },
      { id: 'brief-partners', title: '提醒同伴要具体', paragraphs: ['向同伴提供信息时，说明位置、事件与需要对方做什么，而不是只说“注意一下”。信息过多时，优先传递对当前回合最有用的一点。', '赛后再用同样的结构复盘：当时传递了什么，对方收到了什么，下一次可以怎样更清楚。'] },
    ],
  },
]
