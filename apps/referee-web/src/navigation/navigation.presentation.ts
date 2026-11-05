import type { ModuleId, NavigationModule, NavigationSection } from './modules'

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

/**
 * 模块图标块配色（iOS 设置页风格的图标块，取色限于 macos_fiba.md 的色板）：红、金、绿、墨、沙。
 * 金色与沙色底上用墨色图标，其余用白色图标，对比度均不低于 4.5:1；可用与否由状态文字和色点表达。
 * 类名保持完整静态字符串，供 Tailwind 扫描。
 */
const tiles = {
  red: 'bg-accent-hover text-surface shadow-tile',
  gold: 'bg-gold text-ink shadow-tile',
  green: 'bg-green text-surface shadow-tile',
  ink: 'bg-ink text-surface shadow-tile',
  sand: 'bg-sand text-ink shadow-tile',
} as const

const moduleTints: Record<ModuleId, keyof typeof tiles> = {
  learning: 'red', practice: 'gold', 'wrong-questions': 'sand', exams: 'ink', results: 'green',
  certifications: 'gold', organizations: 'red', events: 'sand', tools: 'ink',
  workbench: 'green', gb2312: 'gold', rules: 'sand', community: 'red', profile: 'ink', feedback: 'green',
}

export function moduleTileClass(module: NavigationModule): string {
  return tiles[moduleTints[module.id]]
}

/** 按可用性把模块拆成「可使用」与「建设中」两组，保持原有顺序；部分可用的模块归入可使用。 */
export function splitByAvailability(ids: readonly ModuleId[], lookup: Record<ModuleId, NavigationModule>): { usable: ModuleId[]; planned: ModuleId[] } {
  const usable: ModuleId[] = []
  const planned: ModuleId[] = []
  for (const id of ids) (lookup[id].availability === 'planned' ? planned : usable).push(id)
  return { usable, planned }
}
