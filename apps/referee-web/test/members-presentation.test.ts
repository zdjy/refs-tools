import { describe, expect, it } from 'vitest'
import type { Membership } from '@refs-tools/contracts/organization-members'
import { memberActionLabels, memberActionLabelsFor, memberRowView } from '../src/views/organizations/members.presentation'

const member = (patch: Partial<Membership> = {}): Membership => ({
  id: 'm1', organizationId: 'o1', userId: 'u1', displayName: 'zdjy', status: 'active',
  version: 1, createdAt: '2026-11-05T02:00:00.000Z', ...patch,
})

describe('成员名单行投影', () => {
  it('状态文案与色点分开给出，时间标签随状态取词', () => {
    expect(memberRowView(member(), '')).toMatchObject({ statusLabel: '正式成员', statusDot: 'bg-green', datePrefix: '加入于' })
    expect(memberRowView(member({ status: 'pending' }), '')).toMatchObject({ statusLabel: '待审核', statusDot: 'bg-gold', datePrefix: '申请于' })
    expect(memberRowView(member({ status: 'rejected' }), '')).toMatchObject({ statusDot: 'bg-muted', datePrefix: '申请于' })
    expect(memberRowView(member({ status: 'removed' }), '')).toMatchObject({ statusLabel: '已移除', statusDot: 'bg-muted', datePrefix: '加入于' })
  })

  it('负责人行标注身份且没有移除操作，普通正式成员可移除', () => {
    const owner = memberRowView(member({ userId: 'owner' }), 'owner')
    expect(owner.isOwner).toBe(true)
    expect(owner.decisions).toEqual([])
    expect(memberRowView(member({ userId: 'u2' }), 'owner')).toMatchObject({ isOwner: false, decisions: ['remove'] })
  })

  it('待审核行按驳回在前、批准在后，顺序与操作区排列一致', () => {
    expect(memberRowView(member({ status: 'pending' }), 'owner').decisions).toEqual(['reject', 'approve'])
    expect(memberRowView(member({ status: 'left' }), 'owner').decisions).toEqual([])
  })

  it('首字母按码点取，保留表情与生僻字；空昵称回退问号', () => {
    expect(memberRowView(member({ displayName: ' 陈静 ' }), '').initial).toBe('陈')
    expect(memberRowView(member({ displayName: '𠮷田' }), '').initial).toBe('𠮷')
    expect(memberRowView(member({ displayName: '  ' }), '').initial).toBe('?')
  })

  it('操作文案与可访问名称都指明作用于哪位成员', () => {
    expect(memberActionLabels).toEqual({ approve: '批准', reject: '驳回', remove: '移除' })
    expect(memberActionLabelsFor.remove('zdjy')).toBe('移除zdjy')
    expect(memberActionLabelsFor.approve('zdjy')).toBe('批准zdjy加入')
  })
})
