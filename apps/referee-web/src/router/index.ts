import { createRouter, type RouterHistory } from 'vue-router'

export function createAppRouter(history: RouterHistory) {
  const router = createRouter({
    history,
    routes: [
      { path: '/', redirect: '/workbench' },
      {
        path: '/workbench',
        name: 'workbench',
        component: () => import('../views/workbench/WorkbenchView.vue'),
        meta: { title: '本地工作台' },
      },
      {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        component: () => import('../views/NotFoundView.vue'),
        meta: { title: '页面不存在' },
      },
    ],
    scrollBehavior: () => ({ top: 0 }),
  })

  router.afterEach((to) => {
    if (typeof document !== 'undefined') {
      document.title = `${String(to.meta.title ?? '裁判工具箱')} | 裁判工具箱`
    }
  })

  return router
}

