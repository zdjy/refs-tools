import { describe, expect, it } from 'vitest'
import { canUpdateOrganizationProfile, organizationStatusAfter } from '../src/organization-state.js'

describe('组织平台治理状态', () => {
  it('只允许审核通过/驳回与冻结/解冻的显式转换', () => {
    expect(organizationStatusAfter('pending_review', 'approve')).toBe('active')
    expect(organizationStatusAfter('pending_review', 'reject')).toBe('rejected')
    expect(organizationStatusAfter('active', 'freeze')).toBe('frozen')
    expect(organizationStatusAfter('frozen', 'unfreeze')).toBe('active')
  })
  it('重复审核、未审冻结和终态恢复均被拒绝', () => {
    for (const status of ['active', 'frozen', 'rejected', 'dissolved'] as const) expect(organizationStatusAfter(status, 'approve')).toBeNull()
    for (const status of ['pending_review', 'rejected', 'dissolved'] as const) {
      expect(organizationStatusAfter(status, 'freeze')).toBeNull()
      expect(organizationStatusAfter(status, 'unfreeze')).toBeNull()
    }
  })
  it('只有审核中、运营中与已冻结的组织可由平台修正资料', () => {
    for (const status of ['pending_review', 'active', 'frozen'] as const) expect(canUpdateOrganizationProfile(status)).toBe(true)
    for (const status of ['rejected', 'dissolved'] as const) expect(canUpdateOrganizationProfile(status)).toBe(false)
  })
})
