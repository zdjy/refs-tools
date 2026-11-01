import { describe, expect, it } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import { createAppRouter } from '../src/router'

const router = createAppRouter(createMemoryHistory())

describe('裁判端静态路由', () => {
  it('根路径配置重定向到工作台且未知路径匹配 404', () => {
    expect(router.resolve('/').matched[0]?.redirect).toBe('/workbench')
    expect(router.resolve('/missing').name).toBe('not-found')
  })

  it('页面路由使用懒加载组件', () => {
    expect(typeof router.resolve('/workbench').matched.at(-1)?.components?.default).toBe('function')
    expect(typeof router.resolve('/missing').matched.at(-1)?.components?.default).toBe('function')
  })
})
