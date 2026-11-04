import { describe, expect, it } from 'vitest'
import { membershipStatusAfter } from '../src/index.js'

describe('成员状态转换', () => {
  it('申请必须批准后成为正式成员，正式成员才可移除或退出', () => {
    expect(membershipStatusAfter('pending', 'approve')).toBe('active')
    expect(membershipStatusAfter('pending', 'reject')).toBe('rejected')
    expect(membershipStatusAfter('pending', 'remove')).toBeNull()
    expect(membershipStatusAfter('active', 'remove')).toBe('removed')
    expect(membershipStatusAfter('active', 'leave')).toBe('left')
    expect(membershipStatusAfter('active', 'reject')).toBeNull()
  })
  it('历史终态不能再次审批或恢复', () => {
    for (const status of ['removed', 'left', 'rejected'] as const) {
      for (const action of ['approve', 'reject', 'remove', 'leave'] as const) expect(membershipStatusAfter(status, action)).toBeNull()
    }
  })
})
