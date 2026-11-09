export type NavigationSection = 'community' | 'learning' | 'tools' | 'organizations' | 'account'
export type ModuleId = 'learning' | 'practice' | 'wrong-questions' | 'exams' | 'results' | 'certifications' | 'organizations' | 'events' | 'tools' | 'workbench' | 'gb2312' | 'rules' | 'community' | 'profile' | 'feedback'
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
  certifications: { id: 'certifications', title: '平台认证', path: '/certifications', description: '申请平台认证、查看进度、补件、历史与申诉', availability: 'available' },
  organizations: { id: 'organizations', title: '我的组织', path: '/organizations', description: '创建与加入组织、回应邀请、成员与角色管理', availability: 'partial' },
  events: { id: 'events', title: '赛事与履职', path: '/events', description: '选派确认、签到及赛后主记录', availability: 'planned', beta: true },
  tools: { id: 'tools', title: '裁判工具', path: '/tools', description: '本地比赛工作台与 GB 2312 区位码工具', availability: 'partial', beta: true },
  workbench: { id: 'workbench', title: '本地比赛工作台', path: '/workbench', description: '记分、技术统计、计时、犯规、操作日志及本地导出', availability: 'available', beta: true },
  gb2312: { id: 'gb2312', title: 'GB 2312 区位码工具', path: '/tools/gb2312', description: '汉字双向查询、派生码及批量转换', availability: 'available', beta: true },
  // 占位工具：先给移动底栏扇形留出第三个入口，页面只展示建设状态，不提供任何查询能力。
  // 不选用工作台的子功能（计时、犯规、比分）作为占位，避免把子功能重复包装成独立模块，见 FS-0006 §3.2。
  rules: { id: 'rules', title: '规则速查', path: '/tools/rules', description: '按规则集版本查询暂停、犯规、计时等参数，仅作提示，不替代裁判最终判断', availability: 'planned', beta: true },
  // 社区即根路径页面，不再保留独立的 /forum 建设说明页，见 FS-0022。
  community: { id: 'community', title: '裁判社区', path: '/', description: '判例讨论、执裁心得与交流', availability: 'available', beta: true },
  // 账号菜单的两项入口：只承诺后续范围，页面仍是建设说明，不假装已有个人主页或反馈工单。
  profile: { id: 'profile', title: '我的主页', path: '/me', description: '个人公开资料、执裁经历与近期动态', availability: 'planned' },
  feedback: { id: 'feedback', title: '意见反馈', path: '/feedback', description: '问题反馈、建议提交与处理进度查询', availability: 'planned' },
} as const satisfies Record<ModuleId, NavigationModule>

export const moduleGroups: readonly { title: string; items: readonly ModuleId[] }[] = [
  { title: '学习与备考', items: ['learning', 'practice', 'exams'] },
  { title: '资质与协作', items: ['certifications', 'organizations', 'events'] },
  { title: '场边与交流', items: ['tools', 'community'] },
]
export const learningEntries: readonly ModuleId[] = ['practice', 'wrong-questions', 'exams', 'results']
export const toolEntries: readonly ModuleId[] = ['workbench', 'gb2312', 'rules']

/** 移动底栏（< tablet）顺序固定：社区、学习、工具、组织、我的，见 FS-0022。 */
export const primaryNavigation: readonly { id: NavigationSection; title: string; path: string }[] = [
  { id: 'community', title: '社区', path: modules.community.path },
  { id: 'learning', title: '学习', path: modules.learning.path },
  { id: 'tools', title: '工具', path: modules.tools.path },
  { id: 'organizations', title: '组织', path: modules.organizations.path },
  { id: 'account', title: '我的', path: '/account' },
]

/**
 * 桌面主导航（≥ tablet）顺序固定：社区、学习、组织、工具。
 * 不含「我的」：账号入口由顶栏用户名菜单承担，见 FS-0020；两套顺序不同，因此单独声明而非过滤。
 */
export const desktopNavigation: readonly { id: NavigationSection; title: string; path: string }[] = [
  { id: 'community', title: '社区', path: modules.community.path },
  { id: 'learning', title: '学习', path: modules.learning.path },
  { id: 'organizations', title: '组织', path: modules.organizations.path },
  { id: 'tools', title: '工具', path: modules.tools.path },
]

/** 仅关联真实存在的页面，不生成尚未实现的业务操作。 */
export function relatedModules(id: ModuleId): readonly ModuleId[] {
  if (id === 'practice') return ['wrong-questions', 'learning']
  if (id === 'exams') return ['results', 'learning']
  if (id === 'wrong-questions') return ['practice', 'learning']
  if (id === 'results') return ['exams', 'learning']
  if (id === 'gb2312') return ['tools', 'workbench']
  if (id === 'profile') return ['organizations', 'certifications']
  if (id === 'feedback') return ['profile']
  return ['learning', 'tools']
}
