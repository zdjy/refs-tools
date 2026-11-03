/**
 * 阅读路由所需的最小元信息。
 * 独立成文件，让主包注册路由时不必携带全部正文；与完整注册表的一致性由 editorial.test.ts 保证。
 */
export const editorialRoutes = [
  { id: 'observation-angle', kind: 'guide', title: '观察位置与视角' },
  { id: 'ruleset-reading', kind: 'guide', title: '规则版本研读' },
  { id: 'pregame-briefing', kind: 'guide', title: '赛前沟通提纲' },
  { id: 'tablework-signals', kind: 'guide', title: '记录台信号与异常报告' },
  { id: 'terminology-check', kind: 'guide', title: '术语核对方法' },
  { id: 'court-communication', kind: 'guide', title: '场上沟通的语言' },
  { id: 'contact-review', kind: 'discussion', title: '接触视角讨论示例' },
  { id: 'postgame-notes', kind: 'discussion', title: '赛后记录讨论示例' },
  { id: 'table-mismatch', kind: 'discussion', title: '记录台信息不一致讨论示例' },
  { id: 'first-season-notes', kind: 'discussion', title: '新人赛季笔记讨论示例' },
] as const

export type EditorialId = typeof editorialRoutes[number]['id']
export type EditorialKind = typeof editorialRoutes[number]['kind']
