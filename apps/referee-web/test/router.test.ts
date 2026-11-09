import { describe, expect, it } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import { createAppRouter } from '../src/router'
import { learningEntries, moduleGroups, modules, primaryNavigation, desktopNavigation, relatedModules, toolEntries } from '../src/navigation/modules'
import { accountMenuLinks } from '../src/navigation/account-menu.presentation'
import { moduleStatus, navigationCurrent } from '../src/navigation/navigation.presentation'

const router = createAppRouter(createMemoryHistory())

describe('裁判端静态路由与导航合同', () => {
  it('根路径即社区页，已下线的 /forum 与未知模块均匹配 404', () => {
    expect(router.resolve('/').name).toBe('community')
    expect(router.resolve('/').matched[0]?.redirect).toBeUndefined()
    for (const path of ['/forum', '/missing', '/tools/missing', '/learning/assets']) expect(router.resolve(path).name).toBe('not-found')
  })

  it('全部路由都有稳定名称、标题及懒加载视图，建设说明传入显式模块', () => {
    const paths = ['/', ...Object.values(modules).map((module) => module.path), '/login', '/register', '/account', '/profile-setting', '/missing']
    for (const path of paths) {
      const route = router.resolve(path)
      expect(route.name).toBeTruthy()
      expect(route.meta.title).toBeTruthy()
      expect(typeof route.matched.at(-1)?.components?.default).toBe('function')
    }
    for (const id of ['practice', 'wrong-questions', 'exams', 'results', 'events', 'rules', 'profile', 'feedback'] as const) {
      expect(router.resolve(modules[id].path).matched[0]?.props.default).toEqual({ moduleId: id })
    }
    expect(router.resolve(modules.certifications.path).name).toBe('certifications')
    expect(router.resolve(modules.certifications.path).matched[0]?.components?.default).toBeTypeOf('function')
    expect(router.resolve(modules.gb2312.path).matched[0]?.components?.default).toBeTypeOf('function')
  })

  it('组织路由：静态路径优先于动态 id，id 仅作为视图 props，且都属于组织导航分区', () => {
    expect(router.resolve('/organizations').name).toBe('organizations')
    expect(router.resolve('/organizations/discover').name).toBe('organization-discover')
    expect(router.resolve('/organizations/new').name).toBe('organization-new')
    const workspace = router.resolve('/organizations/3f2b1c9e-0000-4000-8000-000000000001')
    expect(workspace.name).toBe('organization-workspace')
    expect(workspace.params['organizationId']).toBe('3f2b1c9e-0000-4000-8000-000000000001')
    const review = router.resolve('/organizations/3f2b1c9e-0000-4000-8000-000000000001/certifications/review')
    expect(review.name).toBe('organization-certification-review')
    expect(review.params['organizationId']).toBe('3f2b1c9e-0000-4000-8000-000000000001')
    for (const path of ['/organizations', '/organizations/discover', '/organizations/new', '/organizations/abc', '/organizations/abc/certifications/review']) {
      expect(router.resolve(path).meta.navigation).toBe('organizations')
      expect(typeof router.resolve(path).matched.at(-1)?.components?.default).toBe('function')
    }
  })

  it('模块分组恰有八项且顺序固定，所有导航目标存在', () => {
    expect(moduleGroups.flatMap((group) => group.items)).toEqual(['learning', 'practice', 'exams', 'certifications', 'organizations', 'events', 'tools', 'community'])
    expect(learningEntries).toEqual(['practice', 'wrong-questions', 'exams', 'results'])
    expect(toolEntries).toEqual(['workbench', 'gb2312', 'rules'])
    for (const item of [...Object.values(modules), ...primaryNavigation]) expect(router.resolve(item.path).name).not.toBe('not-found')
    for (const id of Object.keys(modules) as (keyof typeof modules)[]) {
      for (const target of relatedModules(id)) expect(router.resolve(modules[target].path).name).not.toBe('not-found')
    }
  })

  it('桌面与移动导航顺序各自固定，账号菜单项全部指向已实现路由', () => {
    expect(desktopNavigation.map((item) => item.id)).toEqual(['community', 'learning', 'organizations', 'tools'])
    expect(primaryNavigation.map((item) => item.id)).toEqual(['community', 'learning', 'tools', 'organizations', 'account'])
    expect(desktopNavigation.map((item) => item.title)).toEqual(['社区', '学习', '组织', '工具'])
    expect(primaryNavigation.map((item) => item.title)).toEqual(['社区', '学习', '工具', '组织', '我的'])
    expect(primaryNavigation.find((item) => item.id === 'community')?.path).toBe('/')
    expect(accountMenuLinks.map((item) => item.label)).toEqual(['我的主页', '我的组织', '账号设置', '意见反馈'])
    for (const item of accountMenuLinks) expect(router.resolve(item.path).name).not.toBe('not-found')
  })

  it('准确区分可用性及 Beta 规划', () => {
    expect(moduleStatus(modules.learning)).toBe('建设中')
    expect(moduleStatus(modules.tools)).toBe('部分可用 · Beta')
    expect(moduleStatus(modules.workbench)).toBe('可使用 · Beta')
    expect(moduleStatus(modules.gb2312)).toBe('可使用 · Beta')
    expect(moduleStatus(modules.community)).toBe('可使用 · Beta')
    expect(moduleStatus(modules.certifications)).toBe('可使用')
    for (const id of ['events', 'rules'] as const) expect(moduleStatus(modules[id])).toBe('建设中 · Beta 规划')
  })

  it('当前页和栏目使用不同 aria-current，无归属模块不误高亮', () => {
    const expected = { '/': 'community', '/learning': 'learning', '/practice': 'learning', '/wrong-questions': 'learning', '/exams': 'learning', '/results': 'learning', '/tools': 'tools', '/tools/gb2312': 'tools', '/workbench': 'tools', '/organizations': 'organizations', '/account': 'account', '/profile-setting': 'account' }
    for (const [path, section] of Object.entries(expected)) {
      const route = router.resolve(path)
      expect(route.meta.navigation).toBe(section)
      const item = primaryNavigation.find((entry) => entry.id === section)!
      expect(navigationCurrent(route.meta.navigation, path, item)).toBe(path === item.path ? 'page' : 'location')
    }
    for (const path of ['/certifications', '/events', '/login', '/register', '/missing']) {
      for (const item of primaryNavigation) expect(navigationCurrent(router.resolve(path).meta.navigation, path, item)).toBeUndefined()
    }
  })
})
