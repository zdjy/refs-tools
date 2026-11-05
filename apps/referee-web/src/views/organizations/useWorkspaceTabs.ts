import type { Ref } from 'vue'
import type { WorkspaceTab } from './useOrganizationWorkspace'

/**
 * 计算键盘导航后的目标索引，`null` 表示该按键不归 tablist 处理。
 * 方向键按同一次序循环，不声明 aria-orientation：窄屏横排、宽屏仍横排，视觉与语义一致。
 */
export function tabIndexAfter(key: string, index: number, count: number): number | null {
  if (count < 1 || index < 0) return null
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  const step = key === 'ArrowRight' || key === 'ArrowDown' ? 1 : key === 'ArrowLeft' || key === 'ArrowUp' ? -1 : 0
  return step === 0 ? null : (index + step + count) % count
}

/** 焦点跟随选中项移动（自动激活）；焦点环由 focus-visible 提供。 */
export function useWorkspaceTabs(tablist: Ref<HTMLElement | null>, active: Ref<WorkspaceTab>) {
  function onKeydown(event: KeyboardEvent): void {
    const tabs = [...(tablist.value?.querySelectorAll<HTMLElement>('[role="tab"]') ?? [])]
    const index = tabs.findIndex((tab) => tab.dataset['tab'] === active.value)
    const next = tabIndexAfter(event.key, index, tabs.length)
    const target = next === null ? undefined : tabs[next]
    if (!target) return
    event.preventDefault()
    active.value = target.dataset['tab'] as WorkspaceTab
    target.focus()
  }
  return { onKeydown }
}
