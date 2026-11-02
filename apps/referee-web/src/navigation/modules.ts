export type NavigationSection = 'home' | 'learning' | 'tools' | 'forum' | 'account'
export type ModuleId = 'learning' | 'practice' | 'wrong-questions' | 'exams' | 'results' | 'certifications' | 'organizations' | 'events' | 'tools' | 'workbench' | 'gb2312' | 'forum'
export type Availability = 'planned' | 'partial' | 'available'
export interface NavigationModule {
  id: ModuleId
  title: string
  path: string
  description: string
  availability: Availability
  beta?: boolean
}

export const modules = {
  learning: { id: 'learning', title: '学习资料', path: '/learning', description: '规则资料、图文与音视频、收藏及最近访问', availability: 'planned' },
  practice: { id: 'practice', title: '练习与错题', path: '/practice', description: '顺序与随机练习、解析及错题复习', availability: 'planned' },
  'wrong-questions': { id: 'wrong-questions', title: '错题本', path: '/wrong-questions', description: '错题收录、复习与作答反馈', availability: 'planned' },
  exams: { id: 'exams', title: '正式考试', path: '/exams', description: '正式考试、考试历史与成绩查询', availability: 'planned' },
  results: { id: 'results', title: '考试历史与成绩', path: '/results', description: '历史考试尝试、成绩与评分说明', availability: 'planned' },
  certifications: { id: 'certifications', title: '认证与资质', path: '/certifications', description: '组织认证、平台认证、补件与申诉', availability: 'planned' },
  organizations: { id: 'organizations', title: '我的组织', path: '/organizations', description: '创建与加入组织、成员关系及组织事务', availability: 'planned' },
  events: { id: 'events', title: '赛事与履职', path: '/events', description: '选派确认、签到及赛后主记录', availability: 'planned', beta: true },
  tools: { id: 'tools', title: '裁判工具', path: '/tools', description: '本地比赛工作台与 GB 2312 区位码工具', availability: 'partial', beta: true },
  workbench: { id: 'workbench', title: '本地比赛工作台', path: '/workbench', description: '记分、技术统计、计时、犯规、操作日志及本地导出', availability: 'available', beta: true },
  gb2312: { id: 'gb2312', title: 'GB 2312 区位码工具', path: '/tools/gb2312', description: '汉字双向查询、派生码及批量转换', availability: 'planned', beta: true },
  forum: { id: 'forum', title: '裁判社区', path: '/forum', description: '判例讨论、执裁心得与交流', availability: 'planned', beta: true },
} as const satisfies Record<ModuleId, NavigationModule>

export const moduleGroups: readonly { title: string; items: readonly ModuleId[] }[] = [
  { title: '学习与备考', items: ['learning', 'practice', 'exams'] },
  { title: '资质与协作', items: ['certifications', 'organizations', 'events'] },
  { title: '场边与交流', items: ['tools', 'forum'] },
]
export const learningEntries: readonly ModuleId[] = ['practice', 'wrong-questions', 'exams', 'results']
export const toolEntries: readonly ModuleId[] = ['workbench', 'gb2312']
export const primaryNavigation: readonly { id: NavigationSection; title: string; path: string }[] = [
  { id: 'home', title: '首页', path: '/' },
  { id: 'learning', title: '学习', path: modules.learning.path },
  { id: 'tools', title: '工具', path: modules.tools.path },
  { id: 'forum', title: '社区', path: modules.forum.path },
  { id: 'account', title: '我的', path: '/account' },
]

/** 仅关联真实存在的页面，不生成尚未实现的业务操作。 */
export function relatedModules(id: ModuleId): readonly ModuleId[] {
  if (id === 'practice') return ['wrong-questions', 'learning']
  if (id === 'exams') return ['results', 'learning']
  if (id === 'wrong-questions') return ['practice', 'learning']
  if (id === 'results') return ['exams', 'learning']
  if (id === 'gb2312') return ['tools', 'workbench']
  return ['learning', 'tools']
}
