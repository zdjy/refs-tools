import { describe, expect, it } from 'vitest'
import { nextTick, ref } from 'vue'
import type { MyOrganization } from '@refs-tools/contracts/organization-self'
import { ROSTER_PAGE_SIZE, ROSTER_TOOL_MIN, rosterBucket, useOrganizationRoster } from '../src/views/organizations/useOrganizationRoster'

const org = (patch: Partial<MyOrganization> = {}): MyOrganization => ({
  id: 'o1', name: '甲协会', region: '浙江/杭州/西湖', purpose: '', status: 'active',
  createdAt: '2024-01-01T00:00:00.000Z', version: 1, isOwner: false, ownerUserId: 'u1',
  membership: { id: 'm1', status: 'active', version: 1 }, roles: [], canManage: false, canGrantRoles: false,
  governanceReason: null, ...patch,
})
const closed = (status: MyOrganization['status']) => org({ id: `o-${status}`, name: `乙${status}`, status, membership: null })
const many = (count: number) => Array.from({ length: count }, (_, index) => org({ id: `o${index}`, name: `组织${String(index).padStart(2, '0')}` }))

describe('名册分组', () => {
  it('按成员关系与组织状态归入需要处理、已加入或已结束', () => {
    expect(rosterBucket(org())).toBe('active')
    expect(rosterBucket(org({ membership: { id: 'm', status: 'pending', version: 1 } }))).toBe('pending')
    expect(rosterBucket(org({ status: 'pending_review', membership: null }))).toBe('pending')
    expect(rosterBucket(closed('rejected'))).toBe('closed')
    expect(rosterBucket(closed('dissolved'))).toBe('closed')
    // 冻结或解散仍保留成员关系，归入已加入，后果由行内状态文案说明。
    expect(rosterBucket(org({ status: 'frozen' }))).toBe('active')
  })

  it('计数包含全部与三个分组，且总和一致', () => {
    const source = ref([org(), org({ id: 'o2', membership: { id: 'm2', status: 'pending', version: 1 } }), closed('rejected')])
    const state = useOrganizationRoster(source)
    expect(state.counts.value).toEqual({ all: 3, pending: 1, active: 1, closed: 1 })
    expect(state.counts.value.all).toBe(state.counts.value.pending + state.counts.value.active + state.counts.value.closed)
  })
})

describe('检索、筛选与渐进显示', () => {
  it('关键词匹配名称与地区，忽略大小写与首尾空格', () => {
    const source = ref([org({ name: 'Hangzhou Referee', region: '浙江/杭州' }), org({ id: 'o2', name: '宁波裁判协会', region: '浙江/宁波' })])
    const state = useOrganizationRoster(source)
    state.keyword.value = ' hang '
    expect(state.filtered.value.map(item => item.id)).toEqual(['o1'])
    state.keyword.value = '宁波'
    expect(state.filtered.value.map(item => item.id)).toEqual(['o2'])
    state.keyword.value = '   '
    expect(state.filtering.value).toBe(false)
    expect(state.filtered.value).toHaveLength(2)
  })

  it('状态筛选与关键词叠加，重置后恢复全部', () => {
    const source = ref([org({ name: '杭州协会' }), org({ id: 'o2', name: '宁波协会', membership: { id: 'm2', status: 'pending', version: 1 } }), closed('rejected')])
    const state = useOrganizationRoster(source)
    state.filter.value = 'pending'
    expect(state.filtered.value.map(item => item.name)).toEqual(['宁波协会'])
    state.keyword.value = '不存在'
    expect(state.filtered.value).toHaveLength(0)
    expect(state.visible.value).toHaveLength(0)
    state.reset()
    expect(state.filter.value).toBe('all')
    expect(state.keyword.value).toBe('')
    expect(state.visible.value).toHaveLength(3)
  })

  it('按需展开：先渲染一页，再按步长显示，展开后不重复计算剩余数量', () => {
    const state = useOrganizationRoster(ref(many(20)))
    expect(state.visible.value).toHaveLength(ROSTER_PAGE_SIZE)
    expect(state.hidden.value).toBe(20 - ROSTER_PAGE_SIZE)
    expect(state.nextCount.value).toBe(ROSTER_PAGE_SIZE)
    state.showMore()
    expect(state.visible.value).toHaveLength(ROSTER_PAGE_SIZE * 2)
    state.showMore()
    expect(state.visible.value).toHaveLength(20)
    expect(state.hidden.value).toBe(0)
    expect(state.nextCount.value).toBe(0)
  })

  it('换筛选后从第一页重新开始，不保留旧展开位置', async () => {
    const state = useOrganizationRoster(ref(many(20)))
    state.showMore()
    expect(state.visible.value).toHaveLength(ROSTER_PAGE_SIZE * 2)
    state.filter.value = 'active'
    await nextTick()
    expect(state.visible.value).toHaveLength(ROSTER_PAGE_SIZE)
    state.showMore()
    state.keyword.value = '组织1'
    await nextTick()
    expect(state.visible.value.length).toBeLessThanOrEqual(ROSTER_PAGE_SIZE)
  })

  it('少量组织不启用工具行，达到阈值后出现', () => {
    const state = useOrganizationRoster(ref(many(ROSTER_TOOL_MIN - 1)))
    expect(state.showTools.value).toBe(false)
    state.keyword.value = '组织00'
    expect(state.filtered.value.map(item => item.name)).toEqual(['组织00'])
    expect(useOrganizationRoster(ref(many(ROSTER_TOOL_MIN))).showTools.value).toBe(true)
  })

  it('排序：申请中优先，其次已加入，已结束最后；同组按名称拼音', () => {
    const source = ref([closed('rejected'), org({ id: 'o2', name: 'B 队' }), org({ id: 'o3', membership: { id: 'm3', status: 'pending', version: 1 } }), org({ id: 'o4', name: 'A 队' })])
    const state = useOrganizationRoster(source)
    expect(state.filtered.value.map(item => item.id)).toEqual(['o3', 'o4', 'o2', 'o-rejected'])
  })

  it('服务端刷新后新数据参与检索，可见数量不超过剩余条数', () => {
    const source = ref(many(3))
    const state = useOrganizationRoster(source)
    state.keyword.value = '组织0'
    expect(state.filtered.value).toHaveLength(3)
    source.value = many(1)
    expect(state.filtered.value).toHaveLength(1)
    expect(state.visible.value).toHaveLength(1)
    expect(state.hidden.value).toBe(0)
  })
})
