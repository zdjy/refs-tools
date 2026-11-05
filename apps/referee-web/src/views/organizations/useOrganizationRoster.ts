import { computed, ref, watch, type Ref } from 'vue'
import type { MyOrganization } from '@refs-tools/contracts/organization-self'
import type { RosterFilter } from './organizations.presentation'

/** 组织数低于该值时工具行不出现：短列表直接看比先筛选更快。 */
export const ROSTER_TOOL_MIN = 6
/** 首屏渲染行数与「再显示」的增量；总量受 `GET /me/organizations` 的 100 条上限约束。 */
export const ROSTER_PAGE_SIZE = 8

export type RosterBucket = Exclude<RosterFilter, 'all'>

/**
 * 名册分组：待审核的入会申请与被驳回的创建申请需要用户处理，排在已加入之前；
 * 成员关系为 active 的组织即使已被冻结或解散仍算「已加入」，后果由行内状态提示说明。
 */
export function rosterBucket(item: MyOrganization): RosterBucket {
  if (item.membership?.status === 'active') return 'active'
  if (item.membership?.status === 'pending') return 'pending'
  if (item.status === 'pending_review') return 'pending'
  return 'closed'
}

const bucketRank: Record<RosterBucket, number> = { pending: 0, active: 1, closed: 2 }
/** 同组内按名称拼音升序，长列表里比服务端返回的创建顺序更容易定位。 */
const byName = new Intl.Collator('zh-Hans-CN')

/**
 * 「我的组织」名册的浏览状态：分组计数、关键词检索、状态筛选与渐进显示。
 * 检索在本地完成，不额外请求接口；服务端一次返回全部本人组织，最多 100 条。
 */
export function useOrganizationRoster(source: Readonly<Ref<readonly MyOrganization[]>>) {
  const keyword = ref('')
  const filter = ref<RosterFilter>('all')
  const limit = ref(ROSTER_PAGE_SIZE)

  const counts = computed<Record<RosterFilter, number>>(() => {
    const value: Record<RosterFilter, number> = { all: source.value.length, active: 0, pending: 0, closed: 0 }
    for (const item of source.value) value[rosterBucket(item)] += 1
    return value
  })
  const showTools = computed(() => source.value.length >= ROSTER_TOOL_MIN)
  const query = computed(() => keyword.value.trim().toLowerCase())

  const filtered = computed(() => source.value
    .filter(item => filter.value === 'all' || rosterBucket(item) === filter.value)
    .filter(item => !query.value || item.name.toLowerCase().includes(query.value) || item.region.toLowerCase().includes(query.value))
    .slice()
    .sort((a, b) => bucketRank[rosterBucket(a)] - bucketRank[rosterBucket(b)] || byName.compare(a.name, b.name)))
  const visible = computed(() => filtered.value.slice(0, limit.value))
  const hidden = computed(() => filtered.value.length - visible.value.length)
  const nextCount = computed(() => Math.min(hidden.value, ROSTER_PAGE_SIZE))
  const filtering = computed(() => filter.value !== 'all' || query.value !== '')

  // 换关键词或状态后从头看，避免停留在上一轮展开到的位置。
  watch([keyword, filter], () => { limit.value = ROSTER_PAGE_SIZE })
  function showMore() { limit.value += ROSTER_PAGE_SIZE }
  function reset() { keyword.value = ''; filter.value = 'all' }

  return { keyword, filter, counts, showTools, filtered, visible, hidden, nextCount, filtering, showMore, reset }
}
