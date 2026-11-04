import { describe, expect, it } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import { createAppRouter } from '../src/router'
import { modules, primaryNavigation, toolEntries } from '../src/navigation/modules'
import { navigationCurrent } from '../src/navigation/navigation.presentation'
import { fanAngle, toolsFanMore, toolsFanTools } from '../src/navigation/tools-fan.presentation'

const router = createAppRouter(createMemoryHistory())
const toolsItem = primaryNavigation.find((item) => item.id === 'tools')!

describe('移动底栏工具扇形菜单合同', () => {
  it('弧面列出全部工具，短标签不为空且与工具目录同序', () => {
    expect(toolsFanTools.map((tool) => tool.id)).toEqual(toolEntries)
    for (const tool of toolsFanTools) {
      expect(tool.label.length).toBeGreaterThan(0)
      expect(tool.label.length).toBeLessThanOrEqual(4)
      expect(tool.path).toBe(modules[tool.id].path)
    }
    expect(toolsFanTools.map((tool) => tool.label)).toEqual(['工作台', '区位码', '规则速查'])
  })

  it('「全部工具」独立于弧面，指向工具汇总页', () => {
    expect(toolsFanMore).toEqual({ label: '全部工具', path: modules.tools.path })
    expect(toolsFanTools.some((tool) => tool.path === modules.tools.path)).toBe(false)
  })

  it('扇形入口都指向真实路由，占位工具进入建设说明页', () => {
    for (const path of [...toolsFanTools.map((tool) => tool.path), toolsFanMore.path]) {
      expect(router.resolve(path).name).not.toBe('not-found')
    }
    const placeholder = router.resolve(modules.rules.path)
    expect(placeholder.name).toBe('rules')
    expect(placeholder.matched[0]?.props.default).toEqual({ moduleId: 'rules' })
  })

  it('扇形角度围绕竖直方向均分且左右对称', () => {
    expect([0, 1, 2].map((index) => fanAngle(index, 3))).toEqual([-44, 0, 44])
    expect([0, 1, 2, 3, 4].map((index) => fanAngle(index, 5, 40))).toEqual([-40, -20, 0, 20, 40])
    for (const count of [2, 3, 4, 5]) {
      const angles = Array.from({ length: count }, (_, index) => fanAngle(index, count))
      expect(angles.reduce((sum, angle) => sum + angle, 0)).toBeCloseTo(0)
      for (let index = 1; index < count; index += 1) expect(angles[index]!).toBeGreaterThan(angles[index - 1]!)
    }
  })

  it('单个或没有入口时不展开扇面', () => {
    expect(fanAngle(0, 1)).toBe(0)
    expect(fanAngle(0, 0)).toBe(0)
  })

  it('工具触发按钮按栏目高亮，工具子页为 location、汇总页为 page', () => {
    expect(navigationCurrent(router.resolve(modules.workbench.path).meta.navigation, modules.workbench.path, toolsItem)).toBe('location')
    expect(navigationCurrent(router.resolve(modules.gb2312.path).meta.navigation, modules.gb2312.path, toolsItem)).toBe('location')
    expect(navigationCurrent(router.resolve(modules.tools.path).meta.navigation, modules.tools.path, toolsItem)).toBe('page')
    expect(navigationCurrent(router.resolve('/').meta.navigation, '/', toolsItem)).toBeUndefined()
  })
})
