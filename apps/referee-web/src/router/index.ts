import { nextTick } from 'vue'
import { createRouter, type RouterHistory } from 'vue-router'
import { modules, type NavigationSection } from '../navigation/modules'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    navigation?: NavigationSection
  }
}

/** 装配显式静态路由；导航元信息不承担业务授权。 */
export function createAppRouter(history: RouterHistory) {
  const router = createRouter({
    history,
    routes: [
      { path: '/', name: 'home', component: () => import('../views/home/HomeView.vue'), meta: { title: '首页', navigation: 'home' } },
      { path: '/read/observation-angle', name: 'read-observation-angle', component: () => import('../views/reading/ReadingView.vue'), props: { articleId: 'observation-angle' }, meta: { title: '观察位置与视角', navigation: 'learning' } },
      { path: '/read/ruleset-reading', name: 'read-ruleset-reading', component: () => import('../views/reading/ReadingView.vue'), props: { articleId: 'ruleset-reading' }, meta: { title: '规则版本研读', navigation: 'learning' } },
      { path: '/read/pregame-briefing', name: 'read-pregame-briefing', component: () => import('../views/reading/ReadingView.vue'), props: { articleId: 'pregame-briefing' }, meta: { title: '赛前沟通提纲', navigation: 'learning' } },
      { path: '/read/contact-review', name: 'read-contact-review', component: () => import('../views/reading/ReadingView.vue'), props: { articleId: 'contact-review' }, meta: { title: '接触视角讨论示例', navigation: 'forum' } },
      { path: '/read/postgame-notes', name: 'read-postgame-notes', component: () => import('../views/reading/ReadingView.vue'), props: { articleId: 'postgame-notes' }, meta: { title: '赛后记录讨论示例', navigation: 'forum' } },
      { path: modules.learning.path, name: 'learning', component: () => import('../views/learning/LearningEntryView.vue'), meta: { title: '学习中心', navigation: 'learning' } },
      { path: modules.practice.path, name: 'practice', component: () => import('../views/module-status/ModuleStatusView.vue'), props: { moduleId: 'practice' }, meta: { title: modules.practice.title, navigation: 'learning' } },
      { path: modules['wrong-questions'].path, name: 'wrong-questions', component: () => import('../views/module-status/ModuleStatusView.vue'), props: { moduleId: 'wrong-questions' }, meta: { title: modules['wrong-questions'].title, navigation: 'learning' } },
      { path: modules.exams.path, name: 'exams', component: () => import('../views/module-status/ModuleStatusView.vue'), props: { moduleId: 'exams' }, meta: { title: modules.exams.title, navigation: 'learning' } },
      { path: modules.results.path, name: 'results', component: () => import('../views/module-status/ModuleStatusView.vue'), props: { moduleId: 'results' }, meta: { title: modules.results.title, navigation: 'learning' } },
      { path: modules.certifications.path, name: 'certifications', component: () => import('../views/module-status/ModuleStatusView.vue'), props: { moduleId: 'certifications' }, meta: { title: modules.certifications.title } },
      { path: modules.organizations.path, name: 'organizations', component: () => import('../views/module-status/ModuleStatusView.vue'), props: { moduleId: 'organizations' }, meta: { title: modules.organizations.title } },
      { path: modules.events.path, name: 'events', component: () => import('../views/module-status/ModuleStatusView.vue'), props: { moduleId: 'events' }, meta: { title: modules.events.title } },
      { path: modules.tools.path, name: 'tools', component: () => import('../views/tools/ToolsView.vue'), meta: { title: modules.tools.title, navigation: 'tools' } },
      { path: modules.gb2312.path, name: 'gb2312', component: () => import('../views/module-status/ModuleStatusView.vue'), props: { moduleId: 'gb2312' }, meta: { title: modules.gb2312.title, navigation: 'tools' } },
      { path: modules.forum.path, name: 'forum', component: () => import('../views/module-status/ModuleStatusView.vue'), props: { moduleId: 'forum' }, meta: { title: modules.forum.title, navigation: 'forum' } },
      { path: modules.workbench.path, name: 'workbench', component: () => import('../views/workbench/WorkbenchView.vue'), meta: { title: '本地工作台', navigation: 'tools' } },
      { path: '/login', name: 'login', component: () => import('../views/auth/AuthView.vue'), props: { initialMode: 'login' }, meta: { title: '登录' } },
      { path: '/register', name: 'register', component: () => import('../views/auth/AuthView.vue'), props: { initialMode: 'register' }, meta: { title: '创建账号' } },
      { path: '/account', name: 'account', component: () => import('../views/auth/AccountView.vue'), meta: { title: '账号与安全', navigation: 'account' } },
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
