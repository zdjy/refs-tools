import { describe, expect, it } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import { createAppRouter } from '../src/router'
import { learningEntries, moduleGroups, modules, primaryNavigation, relatedModules, toolEntries } from '../src/navigation/modules'
import { moduleStatus, navigationCurrent } from '../src/navigation/navigation.presentation'

const router = createAppRouter(createMemoryHistory())

describe('裁判端静态路由与导航合同', () => {
  it('根路径展示独立首页，未知模块及子路径仍匹配 404', () => {
    expect(router.resolve('/').name).toBe('home')
    expect(router.resolve('/').matched[0]?.redirect).toBeUndefined()
    for (const path of ['/missing', '/tools/missing', '/learning/assets']) expect(router.resolve(path).name).toBe('not-found')
  })

  it('全部路由都有稳定名称、标题及懒加载视图，建设说明传入显式模块', () => {
    const paths = ['/', ...Object.values(modules).map((module) => module.path), '/login', '/register', '/account', '/missing']
    for (const path of paths) {
      const route = router.resolve(path)
      expect(route.name).toBeTruthy()
      expect(route.meta.title).toBeTruthy()
      expect(typeof route.matched.at(-1)?.components?.default).toBe('function')
    }
    for (const id of ['practice', 'wrong-questions', 'exams', 'results', 'certifications', 'organizations', 'events', 'rules', 'forum'] as const) {
      expect(router.resolve(modules[id].path).matched[0]?.props.default).toEqual({ moduleId: id })
    }
    expect(router.resolve(modules.gb2312.path).matched[0]?.components?.default).toBeTypeOf('function')
  })

  it('首页恰有八项且顺序固定，所有导航目标存在', () => {
    expect(moduleGroups.flatMap((group) => group.items)).toEqual(['learning', 'practice', 'exams', 'certifications', 'organizations', 'events', 'tools', 'forum'])
    expect(learningEntries).toEqual(['practice', 'wrong-questions', 'exams', 'results'])
    expect(toolEntries).toEqual(['workbench', 'gb2312', 'rules'])
    for (const item of [...Object.values(modules), ...primaryNavigation]) expect(router.resolve(item.path).name).not.toBe('not-found')
    for (const id of Object.keys(modules) as (keyof typeof modules)[]) {
      for (const target of relatedModules(id)) expect(router.resolve(modules[target].path).name).not.toBe('not-found')
    }
  })

  it('准确区分可用性及 Beta 规划', () => {
    expect(moduleStatus(modules.learning)).toBe('建设中')
    expect(moduleStatus(modules.tools)).toBe('部分可用 · Beta')
    expect(moduleStatus(modules.workbench)).toBe('可使用 · Beta')
    expect(moduleStatus(modules.gb2312)).toBe('可使用 · Beta')
    for (const id of ['events', 'forum', 'rules'] as const) expect(moduleStatus(modules[id])).toBe('建设中 · Beta 规划')
  })

  it('当前页和栏目使用不同 aria-current，无归属模块不误高亮', () => {
    const expected = { '/': 'home', '/learning': 'learning', '/practice': 'learning', '/wrong-questions': 'learning', '/exams': 'learning', '/results': 'learning', '/tools': 'tools', '/tools/gb2312': 'tools', '/workbench': 'tools', '/forum': 'forum', '/account': 'account' }
    for (const [path, section] of Object.entries(expected)) {
      const route = router.resolve(path)
      expect(route.meta.navigation).toBe(section)
      const item = primaryNavigation.find((entry) => entry.id === section)!
      expect(navigationCurrent(route.meta.navigation, path, item)).toBe(path === item.path ? 'page' : 'location')
    }
    for (const path of ['/organizations', '/certifications', '/events', '/login', '/register', '/missing']) {
      for (const item of primaryNavigation) expect(navigationCurrent(router.resolve(path).meta.navigation, path, item)).toBeUndefined()
    }
  })
})
