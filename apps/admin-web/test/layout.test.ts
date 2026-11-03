import { createRenderer, defineComponent, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useLayout } from '../src/layout/useLayout'

// 无 DOM 的挂载仅验证自有生命周期与焦点编排；Drawer 的真实焦点约束另做浏览器验收。
const renderer = createRenderer<object, object>({
  patchProp() {}, insert() {}, remove() {}, createElement: () => ({}),
  createText: () => ({}), createComment: () => ({}), setText() {}, setElementText() {},
  parentNode: () => null, nextSibling: () => null,
})
const cleanups: (() => void)[] = []
afterEach(() => { cleanups.splice(0).forEach(cleanup => cleanup()); vi.unstubAllGlobals() })

function setup(desktop = false) {
  let listener = () => {}
  const media = { matches: desktop, addEventListener: vi.fn((_event, handler) => { listener = handler }), removeEventListener: vi.fn() }
  const triggerFocus = vi.fn()
  const mainFocus = vi.fn()
  const path = ref('/')
  vi.stubGlobal('window', { matchMedia: vi.fn(() => media) })
  vi.stubGlobal('document', { getElementById: vi.fn(() => ({ focus: triggerFocus })) })
  let state!: ReturnType<typeof useLayout>
  const app = renderer.createApp(defineComponent({
    setup() { state = useLayout(() => path.value); return () => null },
  }))
  app.mount({})
  state.main.value = { focus: mainFocus } as unknown as HTMLElement
  cleanups.push(() => app.unmount())
  return { state, path, media, mainFocus, triggerFocus, app, resize: (matches: boolean) => { media.matches = matches; listener() } }
}

describe('模板布局适配', () => {
  it('移动端折叠状态控制 Drawer，普通关闭恢复触发器；桌面折叠不打开 Drawer', async () => {
    const { state, triggerFocus, resize } = setup()
    expect(state.isMobile.value).toBe(true)
    state.collapsed.value = true
    expect(state.showSideDrawer.value).toBe(true)
    state.closeMenu()
    await state.afterMenuClose()
    expect(triggerFocus).toHaveBeenCalledOnce()
    resize(true)
    state.collapsed.value = true
    expect(state.showSideDrawer.value).toBe(false)
  })

  it('菜单导航在关闭后定位主内容，不把焦点留在背景；普通导航直接定位', async () => {
    const { state, path, mainFocus, triggerFocus } = setup()
    state.showSideDrawer.value = true
    state.closeMenu()
    path.value = '/audit'
    await nextTick()
    expect(mainFocus).not.toHaveBeenCalled()
    await state.afterMenuClose()
    expect(mainFocus).toHaveBeenCalledOnce()
    expect(triggerFocus).not.toHaveBeenCalled()
    path.value = '/content'
    await nextTick(); await nextTick()
    expect(mainFocus).toHaveBeenCalledTimes(2)
  })

  it('跨越断点关闭菜单且定位内容，卸载移除监听器', async () => {
    const { state, resize, media, mainFocus, app } = setup()
    state.showSideDrawer.value = true
    resize(true)
    expect(state.collapsed.value).toBe(false)
    await state.afterMenuClose()
    expect(mainFocus).toHaveBeenCalledOnce()
    app.unmount()
    expect(media.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })
})
