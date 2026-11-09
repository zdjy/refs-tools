import { nextTick, watch, type Ref } from 'vue'
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

/**
 * 选中项可能落在横滑可视区之外（320px 附近、方向键跳转、切换组织后回到概览），
 * 选中后把它滚回视野。`block: 'nearest'` 不触发页面纵向滚动。
 */
export function scrollTabIntoView(tablist: HTMLElement | null, id: WorkspaceTab): void {
  tablist?.querySelector<HTMLElement>(`[data-tab="${id}"]`)?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
}

/** 焦点跟随选中项移动（自动激活）；焦点环由 focus-visible 提供。 */
export function useWorkspaceTabs(tablist: Ref<HTMLElement | null>, active: Ref<WorkspaceTab>,
  select: (tab: WorkspaceTab) => boolean = tab => { active.value = tab; return true }) {
  function onKeydown(event: KeyboardEvent): void {
    const tabs = [...(tablist.value?.querySelectorAll<HTMLElement>('[role="tab"]') ?? [])]
    const index = tabs.findIndex((tab) => tab.dataset['tab'] === active.value)
    const next = tabIndexAfter(event.key, index, tabs.length)
    const target = next === null ? undefined : tabs[next]
    if (!target) return
    event.preventDefault()
    if (select(target.dataset['tab'] as WorkspaceTab)) target.focus()
  }
  watch(active, (id) => { void nextTick(() => scrollTabIntoView(tablist.value, id)) })
  return { onKeydown }
}
