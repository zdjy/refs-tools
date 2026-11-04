import { nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { useRoute } from 'vue-router'

/** 账号菜单面板的 DOM id，供触发按钮的 aria-controls 引用。 */
export const ACCOUNT_MENU_ID = 'account-menu'

/**
 * 顶栏账号菜单的开关、焦点与键盘管理。
 * 打开后焦点进入首个菜单项，方向键在菜单项间移动，Escape 收起并把焦点还给触发按钮；
 * 焦点移出面板或点击面板外部同样收起。导航由 RouterLink 完成，此处不调用 router。
 */
export function useAccountMenu(trigger: Ref<HTMLElement | null>, panel: Ref<HTMLElement | null>) {
  const route = useRoute()
  const open = ref(false)

  function items(): HTMLElement[] {
    return [...(panel.value?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])]
  }

  function close(restoreFocus = false): void {
    if (!open.value) return
    open.value = false
    if (restoreFocus) trigger.value?.focus()
  }

  async function toggle(fromKeyboard = false): Promise<void> {
    open.value = !open.value
    if (!open.value || !fromKeyboard) return
    // 键盘触发时把焦点交给首个菜单项，用户不必额外按 Tab；鼠标打开则保留按钮焦点，不弹焦点环。
    await nextTick()
    items()[0]?.focus()
  }

  function onKeydown(event: KeyboardEvent): void {
    if (!open.value) return
    if (event.key === 'Escape') {
      event.preventDefault()
      close(true)
      return
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    const list = items()
    if (!list.length) return
    event.preventDefault()
    const index = list.indexOf(document.activeElement as HTMLElement)
    const step = event.key === 'ArrowUp' ? -1 : 1
    const target = event.key === 'Home' ? 0 : event.key === 'End' ? list.length - 1 : (index + step + list.length) % list.length
    list[target]?.focus()
  }

  function onFocusout(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null
    if (next && (panel.value?.contains(next) || trigger.value?.contains(next))) return
    close()
  }

  function onPointerdown(event: PointerEvent): void {
    const target = event.target as Node | null
    if (target && (panel.value?.contains(target) || trigger.value?.contains(target))) return
    close()
  }

  watch(() => route.fullPath, () => close())

  onMounted(() => {
    document.addEventListener('keydown', onKeydown)
    document.addEventListener('pointerdown', onPointerdown)
  })
  onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeydown)
    document.removeEventListener('pointerdown', onPointerdown)
  })

  return { open, toggle, close, onFocusout }
}
