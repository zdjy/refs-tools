import { createRouter, type RouterHistory, type RouteRecordRaw } from 'vue-router'
import { adminModules } from './modules'

export const routes: RouteRecordRaw[] = [
  { path: '/', component: () => import('../views/dashboard/DashboardView.vue'), meta: { title: '运营工作台' } },
  { path: '/login', component: () => import('../views/login/LoginView.vue'), meta: { title: '管理端登录' } },
  ...adminModules.map((module) => ({
    path: module.path, component: () => import('../views/module/ModuleView.vue'),
    props: { module }, meta: { title: module.title },
  })),
  { path: '/audit', component: () => import('../views/audit/AuditView.vue'), meta: { title: '操作审计' } },
  { path: '/:pathMatch(.*)*', component: () => import('../views/NotFoundView.vue'), meta: { title: '页面不存在' } },
]

/** 仅映射导航；受保护资源的实时授权仍由 API 执行。 */
export function createAdminRouter(history: RouterHistory) {
  return createRouter({ history, routes, scrollBehavior: () => ({ top: 0 }) })
}
