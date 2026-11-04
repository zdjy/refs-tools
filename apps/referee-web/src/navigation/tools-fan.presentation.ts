import { modules, toolEntries, type ModuleId } from './modules'

export interface ToolsFanTool {
  id: ModuleId
  label: string
  path: string
}

/** 弧面单项宽度只有 72px，完整名称由工具汇总页承担，这里保留可辨识的短标签。 */
const fanLabels: Partial<Record<ModuleId, string>> = { workbench: '工作台', gb2312: '区位码', rules: '规则速查' }

/**
 * 弧面上的工具入口，顺序与工具目录一致，不按使用频率排序。
 * 「全部工具」不放在弧面里：它是目录入口，与具体工具不同权，另由 toolsFanMore 承载。
 */
export const toolsFanTools: readonly ToolsFanTool[] = toolEntries.map((id) => ({ id, label: fanLabels[id] ?? modules[id].title, path: modules[id].path }))

/** 弧面下方独立胶囊：进入全部工具汇总页。 */
export const toolsFanMore = { label: '全部工具', path: modules.tools.path } as const

/**
 * 扇形以底栏「工具」按钮为圆心向上展开，返回第 index 项相对竖直方向的旋转角度（度）。
 * 首项最左、末项最右，均分在 ±spreadDeg 之间；只有一项时不展开。
 */
export function fanAngle(index: number, count: number, spreadDeg = 44): number {
  if (count <= 1) return 0
  const half = (count - 1) / 2
  return ((index - half) / half) * spreadDeg
}
