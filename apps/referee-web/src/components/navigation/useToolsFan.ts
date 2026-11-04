import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { useRoute } from 'vue-router'

/** 扇形菜单的 DOM id，供触发按钮的 aria-controls 引用。 */
export const TOOLS_FAN_ID = 'mobile-tools-fan'

/** 底栏在 tablet 断点（960px）隐藏，与该断点保持一致，见样式规约的断点表。 */
const DESKTOP_QUERY = '(min-width: 960px)'

/**
 * 移动底栏工具扇形的开关与焦点管理。
 * 路由变化、Escape、点击遮罩以及切到桌面断点都会收起；Escape 收起后焦点回到触发按钮，
 * 避免键盘用户丢失位置。菜单项本身是链接，导航由 RouterLink 完成，不在此处调用 router。
 */
export function useToolsFan(trigger: Ref<HTMLElement | null>) {
  const route = useRoute()
  const open = ref(false)

  function close(restoreFocus = false): void {
    if (!open.value) return
    open.value = false
    if (restoreFocus) trigger.value?.focus()
  }

  function toggle(): void {
    open.value = !open.value
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') close(true)
  }

  const desktop = typeof window === 'undefined' ? undefined : window.matchMedia(DESKTOP_QUERY)
  function onBreakpoint(): void {
    if (desktop?.matches) close()
  }

  watch(() => route.fullPath, () => close())

  onMounted(() => {
    document.addEventListener('keydown', onKeydown)
    desktop?.addEventListener('change', onBreakpoint)
  })
  onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeydown)
    desktop?.removeEventListener('change', onBreakpoint)
  })

  return { open, toggle, close }
}
