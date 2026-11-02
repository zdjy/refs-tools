import type { NavigationModule, NavigationSection } from './modules'

/** 可用性与发布阶段分开表达，避免把 Beta 规划误认为已可用。 */
export function moduleStatus(module: NavigationModule): string {
  const availability = { planned: '建设中', partial: '部分可用', available: '可使用' }[module.availability]
  return module.beta ? `${availability} · ${module.availability === 'planned' ? 'Beta 规划' : 'Beta'}` : availability
}

/** 子页面标记栏目位置，无归属页面不高亮首页。 */
export function navigationCurrent(section: unknown, path: string, item: { id: NavigationSection; path: string }): 'page' | 'location' | undefined {
  if (section !== item.id) return undefined
  return path === item.path ? 'page' : 'location'
}
