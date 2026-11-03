import { computed, nextTick, onMounted, onScopeDispose, ref, watch } from 'vue'

/** 保留模板的折叠/移动 Drawer 模型；关闭动效完成后再恢复焦点，避免焦点落到背景。 */
export function useLayout(currentPath: () => string) {
  const collapsed = ref(false)
  const isMobile = ref(true)
  const main = ref<HTMLElement>()
  const menuWidth = 240
  const drawerWidth = 'min(280px, calc(100vw - 32px))'
  const showSideDrawer = computed({
    get: () => isMobile.value && collapsed.value,
    set: (val) => { collapsed.value = val },
  })
  let navigated = false
  let menuClosing = false
  let desktop: MediaQueryList | undefined

  function closeMenu() { menuClosing = true; showSideDrawer.value = false }
  function checkMobileMode() {
    const wasOpen = showSideDrawer.value
    isMobile.value = !desktop?.matches
    collapsed.value = false
    if (wasOpen) { navigated = true; menuClosing = true }
  }
  watch(currentPath, async () => {
    if (showSideDrawer.value || menuClosing) { navigated = true; closeMenu() }
    else { await nextTick(); main.value?.focus() }
  })
  async function afterMenuClose() {
    const focusMain = navigated
    navigated = false
    menuClosing = false
    await nextTick()
    if (focusMain) main.value?.focus()
    else document.getElementById('admin-menu-trigger')?.focus()
  }
  onMounted(() => {
    // 与 Tailwind lg 一致，只在跨越断点时重置，软键盘/同档尺寸变化不关闭菜单。
    desktop = window.matchMedia('(min-width: 1100px)')
    checkMobileMode()
    desktop.addEventListener('change', checkMobileMode)
  })
  onScopeDispose(() => desktop?.removeEventListener('change', checkMobileMode))
  return { collapsed, isMobile, menuWidth, drawerWidth, showSideDrawer, main, closeMenu, afterMenuClose }
}
