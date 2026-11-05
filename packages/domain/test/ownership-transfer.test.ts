import { describe, expect, it } from 'vitest'
import { canTransferOwnership, ownershipTransferStatus } from '../src/index.js'

const now = new Date('2026-11-02T12:00:00Z')
const later = new Date('2026-11-09T12:00:00Z')

describe('所有权移交请求状态', () => {
  it('pending 未到期保持 pending，到期时刻立即 expired', () => {
    expect(ownershipTransferStatus({ status: 'pending', expiresAt: later }, now)).toBe('pending')
    expect(ownershipTransferStatus({ status: 'pending', expiresAt: now }, now)).toBe('expired')
    expect(ownershipTransferStatus({ status: 'pending', expiresAt: new Date(now.getTime() - 1) }, now)).toBe('expired')
  })
  it('终态不因到期时间改变', () => {
    for (const status of ['accepted', 'declined', 'cancelled', 'expired', 'superseded'] as const) {
      expect(ownershipTransferStatus({ status, expiresAt: new Date(now.getTime() - 1) }, now)).toBe(status)
    }
  })
})

describe('组织可移交状态', () => {
  it('负责人发起仅限 active，冻结期间不能发起新业务', () => {
    expect(canTransferOwnership('active', 'owner')).toBe(true)
    expect(canTransferOwnership('frozen', 'owner')).toBe(false)
  })
  it('平台管理员可处理 active 与 frozen', () => {
    expect(canTransferOwnership('active', 'platform')).toBe(true)
    expect(canTransferOwnership('frozen', 'platform')).toBe(true)
  })
  it('待审核、已驳回与已解散的组织任何路径都不可移交', () => {
    for (const status of ['pending_review', 'rejected', 'dissolved'] as const) {
      expect(canTransferOwnership(status, 'owner')).toBe(false)
      expect(canTransferOwnership(status, 'platform')).toBe(false)
    }
  })
})
