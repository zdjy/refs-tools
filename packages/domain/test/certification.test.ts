import { describe, expect, it } from 'vitest'
import { certificationStatusAfter, effectiveCertificationStatus } from '../src/certification.js'

describe('认证状态与当前效力', () => {
  it('人工决定只允许明确的状态转换', () => {
    expect(certificationStatusAfter('under_review', 'approve')).toBe('approved')
    expect(certificationStatusAfter('under_review', 'needs_more_information')).toBe('needs_more_information')
    expect(certificationStatusAfter('approved', 'suspend')).toBe('suspended')
    expect(certificationStatusAfter('suspended', 'resume')).toBe('approved')
    expect(certificationStatusAfter('suspended', 'revoke')).toBe('revoked')
    expect(certificationStatusAfter('draft', 'approve')).toBeNull()
    expect(certificationStatusAfter('revoked', 'resume')).toBeNull()
    expect(certificationStatusAfter('rejected', 'approve')).toBeNull()
  })
  it('退出和冻结暂停当前效力，恢复成员关系不覆盖人工暂停或撤销', () => {
    expect(effectiveCertificationStatus('approved', true, false)).toBe('suspended')
    expect(effectiveCertificationStatus('approved', false, true)).toBe('suspended')
    expect(effectiveCertificationStatus('approved', true, true)).toBe('approved')
    expect(effectiveCertificationStatus('suspended', true, true)).toBe('suspended')
    expect(effectiveCertificationStatus('revoked', true, true)).toBe('revoked')
    expect(effectiveCertificationStatus('under_review', false, false)).toBe('under_review')
  })
})
