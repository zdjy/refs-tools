import { describe, expect, it } from 'vitest'
import { platformInviteStatus } from '../src/index.js'

const now = new Date('2026-11-02T12:00:00Z')
const base = { usedAt: null, revokedAt: null, expiresAt: new Date('2026-11-05T12:00:00Z') }

describe('平台创建邀请码状态', () => {
  it('未使用、未撤销且未到期为 active', () => {
    expect(platformInviteStatus(base, now)).toBe('active')
  })
  it('到期时刻立即 expired，早于到期时刻仍 active', () => {
    expect(platformInviteStatus({ ...base, expiresAt: now }, now)).toBe('expired')
    expect(platformInviteStatus({ ...base, expiresAt: new Date(now.getTime() + 1) }, now)).toBe('active')
  })
  it('撤销为 revoked，且优先于到期', () => {
    expect(platformInviteStatus({ ...base, revokedAt: now }, now)).toBe('revoked')
    expect(platformInviteStatus({ ...base, revokedAt: now, expiresAt: now }, now)).toBe('revoked')
  })
  it('已使用优先于过期，使用后到期不改变已创建组织的来源', () => {
    expect(platformInviteStatus({ ...base, usedAt: now }, now)).toBe('used')
    expect(platformInviteStatus({ ...base, usedAt: now, expiresAt: new Date(now.getTime() - 1) }, now)).toBe('used')
  })
})
