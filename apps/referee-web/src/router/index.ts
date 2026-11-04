import { nextTick } from 'vue'
import { createRouter, type RouteRecordRaw, type RouterHistory } from 'vue-router'
import { editorialRoutes } from '../content/editorial-routes'
import { modules, type NavigationSection } from '../navigation/modules'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    navigation?: NavigationSection
  }
}

/** 阅读页路由由内容注册表生成：仍是显式静态路径，未知 slug 不会匹配到任意文章。 */
const readingRoutes: RouteRecordRaw[] = editorialRoutes.map((item) => ({
  path: `/read/${item.id}`,
  name: `read-${item.id}`,
  component: () => import('../views/reading/ReadingView.vue'),
  props: { articleId: item.id },
  meta: { title: item.title, navigation: item.kind === 'guide' ? 'learning' : 'community' },
}))

/** 装配显式静态路由；导航元信息不承担业务授权。 */
export function createAppRouter(history: RouterHistory) {
  const router = createRouter({
    history,
    routes: [
      { path: '/', name: 'community', component: () => import('../views/community/CommunityView.vue'), meta: { title: '社区', navigation: 'community' } },
      ...readingRoutes,
      { path: modules.learning.path, name: 'learning', component: () => import('../views/learning/LearningEntryView.vue'), meta: { title: '学习中心', navigation: 'learning' } },
      { path: modules.practice.path, name: 'practice', component: () => import('../views/module-status/ModuleStatusView.vue'), props: { moduleId: 'practice' }, meta: { title: modules.practice.title, navigation: 'learning' } },
      { path: modules['wrong-questions'].path, name: 'wrong-questions', component: () => import('../views/module-status/ModuleStatusView.vue'), props: { moduleId: 'wrong-questions' }, meta: { title: modules['wrong-questions'].title, navigation: 'learning' } },
      { path: modules.exams.path, name: 'exams', component: () => import('../views/module-status/ModuleStatusView.vue'), props: { moduleId: 'exams' }, meta: { title: modules.exams.title, navigation: 'learning' } },
      { path: modules.results.path, name: 'results', component: () => import('../views/module-status/ModuleStatusView.vue'), props: { moduleId: 'results' }, meta: { title: modules.results.title, navigation: 'learning' } },
      { path: modules.certifications.path, name: 'certifications', component: () => import('../views/module-status/ModuleStatusView.vue'), props: { moduleId: 'certifications' }, meta: { title: modules.certifications.title } },
      { path: modules.organizations.path, name: 'organizations', component: () => import('../views/module-status/ModuleStatusView.vue'), props: { moduleId: 'organizations' }, meta: { title: modules.organizations.title, navigation: 'organizations' } },
      { path: modules.events.path, name: 'events', component: () => import('../views/module-status/ModuleStatusView.vue'), props: { moduleId: 'events' }, meta: { title: modules.events.title } },
      { path: modules.tools.path, name: 'tools', component: () => import('../views/tools/ToolsView.vue'), meta: { title: modules.tools.title, navigation: 'tools' } },
      { path: modules.gb2312.path, name: 'gb2312', component: () => import('../views/gb2312/Gb2312View.vue'), meta: { title: modules.gb2312.title, navigation: 'tools' } },
      { path: modules.rules.path, name: 'rules', component: () => import('../views/module-status/ModuleStatusView.vue'), props: { moduleId: 'rules' }, meta: { title: modules.rules.title, navigation: 'tools' } },
      { path: modules.workbench.path, name: 'workbench', component: () => import('../views/workbench/WorkbenchView.vue'), meta: { title: '本地工作台', navigation: 'tools' } },
      { path: '/login', name: 'login', component: () => import('../views/auth/AuthView.vue'), props: { initialMode: 'login' }, meta: { title: '登录' } },
      { path: '/register', name: 'register', component: () => import('../views/auth/AuthView.vue'), props: { initialMode: 'register' }, meta: { title: '创建账号' } },
      { path: '/account', name: 'account', component: () => import('../views/auth/AccountView.vue'), meta: { title: '账号与安全', navigation: 'account' } },
      // 账号菜单的两项入口：先给出准确的建设状态，不伪装成已上线的个人主页或反馈工单，见 FS-0020。
      { path: modules.profile.path, name: 'profile', component: () => import('../views/module-status/ModuleStatusView.vue'), props: { moduleId: 'profile' }, meta: { title: modules.profile.title, navigation: 'account' } },
      { path: modules.feedback.path, name: 'feedback', component: () => import('../views/module-status/ModuleStatusView.vue'), props: { moduleId: 'feedback' }, meta: { title: modules.feedback.title } },
      { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../views/NotFoundView.vue'), meta: { title: '页面不存在' } },
    ],
    scrollBehavior(to) {
      const anchor = to.hash && typeof document !== 'undefined' ? document.getElementById(to.hash.slice(1)) : null
      if (anchor) return { el: anchor, top: Number.parseFloat(getComputedStyle(anchor).scrollMarginTop) || 0 }
      return { top: 0 }
    },
  })

  router.afterEach(async (to, _from, failure) => {
    if (failure || typeof document === 'undefined') return
    document.title = `${String(to.meta.title ?? '裁判工具箱')} | 裁判工具箱`
    await nextTick()
    if (router.currentRoute.value.fullPath !== to.fullPath) return
    const anchor = to.hash ? document.getElementById(to.hash.slice(1)) : null
    const target = anchor ?? document.querySelector<HTMLElement>('main h1') ?? document.querySelector<HTMLElement>('main')
    if (target) {
      target.tabIndex = -1
      target.focus({ preventScroll: true })
    }
  })
  return router
}
