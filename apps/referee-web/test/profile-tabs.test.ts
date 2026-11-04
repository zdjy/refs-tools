import { describe, expect, it } from 'vitest'
import { profileTabs, tabIndexAfter } from '../src/views/profile/useProfileTabs'

describe('账号设置分区 Tab', () => {
  it('三个分区顺序固定：个人资料、修改邮箱、修改密码', () => {
    expect(profileTabs.map((tab) => tab.id)).toEqual(['profile', 'email', 'password'])
    expect(profileTabs.map((tab) => tab.label)).toEqual(['个人资料', '修改邮箱', '修改密码'])
  })

  it('左右与上下方向键都按同一次序循环，Home/End 跳到首尾', () => {
    expect(tabIndexAfter('ArrowRight', 0, 3)).toBe(1)
    expect(tabIndexAfter('ArrowDown', 2, 3)).toBe(0)
    expect(tabIndexAfter('ArrowLeft', 0, 3)).toBe(2)
    expect(tabIndexAfter('ArrowUp', 1, 3)).toBe(0)
    expect(tabIndexAfter('Home', 2, 3)).toBe(0)
    expect(tabIndexAfter('End', 0, 3)).toBe(2)
  })

  it('其他按键不归 tablist 处理，越界输入返回 null', () => {
    for (const key of ['Tab', 'Enter', ' ', 'a', 'Escape']) expect(tabIndexAfter(key, 1, 3)).toBeNull()
    expect(tabIndexAfter('ArrowRight', 0, 0)).toBeNull()
    expect(tabIndexAfter('ArrowRight', -1, 3)).toBeNull()
  })
})
