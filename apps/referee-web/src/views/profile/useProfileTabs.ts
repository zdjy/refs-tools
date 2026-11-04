import { ref, type Ref } from 'vue'

export type ProfileTabId = 'profile' | 'email' | 'password'

/** 三个分区只做展示投影：标签与顺序固定，不按状态重排。 */
export const profileTabs: readonly { id: ProfileTabId; label: string }[] = [
  { id: 'profile', label: '个人资料' },
  { id: 'email', label: '修改邮箱' },
  { id: 'password', label: '修改密码' },
]

/**
 * 计算键盘导航后的目标索引，`null` 表示该按键不归 tablist 处理。
 * 移动端是横向一排、桌面是纵向栏，因此左右与上下方向键都按同一次序循环，
 * 不声明 `aria-orientation`，避免在断点切换后与视觉方向不一致。
 */
export function tabIndexAfter(key: string, index: number, count: number): number | null {
  if (count < 1 || index < 0) return null
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  const step = key === 'ArrowRight' || key === 'ArrowDown' ? 1
    : key === 'ArrowLeft' || key === 'ArrowUp' ? -1 : 0
  return step === 0 ? null : (index + step + count) % count
}

/** 焦点跟随选中项移动（自动激活），焦点环由 `focus-visible` 提供。 */
export function useProfileTabs(tablist: Ref<HTMLElement | null>) {
  const active = ref<ProfileTabId>('profile')

  function select(id: ProfileTabId): void {
    active.value = id
  }

  function onKeydown(event: KeyboardEvent): void {
    const tabs = [...(tablist.value?.querySelectorAll<HTMLElement>('[role="tab"]') ?? [])]
    const index = tabs.findIndex((tab) => tab.dataset['tab'] === active.value)
    const next = tabIndexAfter(event.key, index, tabs.length)
    const target = next === null ? undefined : tabs[next]
    if (!target) return
    event.preventDefault()
    active.value = target.dataset['tab'] as ProfileTabId
    target.focus()
  }

  return { active, select, onKeydown }
}
