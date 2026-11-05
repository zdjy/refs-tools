import { describe, expect, it } from 'vitest'
import { joinCodeStatus } from '../src/index.js'

const now = new Date('2026-11-02T12:00:00Z')
const base = { revokedAt: null, expiresAt: new Date('2026-11-09T12:00:00Z'), uses: 0, maxUses: 2 }

describe('成员码状态', () => {
  it('未到期且有剩余次数为 active', () => {
    expect(joinCodeStatus(base, now)).toBe('active')
    expect(joinCodeStatus({ ...base, uses: 1 }, now)).toBe('active')
  })
  it('次数用尽为 exhausted，到期时刻立即 expired', () => {
    expect(joinCodeStatus({ ...base, uses: 2 }, now)).toBe('exhausted')
    expect(joinCodeStatus({ ...base, expiresAt: now }, now)).toBe('expired')
    expect(joinCodeStatus({ ...base, expiresAt: new Date(now.getTime() - 1) }, now)).toBe('expired')
  })
  it('撤销优先于过期与用尽', () => {
    const revoked = { ...base, revokedAt: now, uses: 2, expiresAt: now }
    expect(joinCodeStatus(revoked, now)).toBe('revoked')
  })
})
