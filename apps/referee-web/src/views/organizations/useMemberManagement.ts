import { computed, ref, type Ref } from 'vue'
import type { Candidate } from '@refs-tools/contracts/organization-access'
import type { Membership, OrganizationInvitation } from '@refs-tools/contracts/organization-members'
import { organizationsApi, type OrganizationsApi } from '../../api/organizations.api'
import { useAction, useLoadable } from './organization-primitives'

const PAGE_SIZE = 20

/**
 * 成员名单、审核与移除。关键词由服务端过滤后分页，所以计数与页数都是筛选后的结果；
 * 写入成功后重新读取当前页：移除或审核可能使当前页越界，此时回退到新的最后一页。
 * 页码、关键词变化与组织切换由 `useLoadable` 的请求序号保证旧响应不覆盖新结果。
 */
export function useMemberManagement(organizationId: Ref<string>, api: OrganizationsApi = organizationsApi) {
  const page = ref(1)
  const keyword = ref('')
  const list = useLoadable(() => api.members(organizationId.value, {
    page: String(page.value), pageSize: String(PAGE_SIZE), keyword: keyword.value.trim(),
  }))
  const action = useAction()
  const stale = ref('')

  const items = computed<Membership[]>(() => list.data.value?.items ?? [])
  const canManage = computed(() => list.data.value?.canManage === true)
  const total = computed(() => list.data.value?.total ?? 0)
  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
  const filtering = computed(() => keyword.value.trim() !== '')

  async function load() { stale.value = ''; return list.load() }
  async function go(next: number) { page.value = Math.min(Math.max(1, next), pageCount.value); return load() }
  /** 关键词只在提交时生效并回到第一页；输入为空即取消筛选。 */
  async function search() { page.value = 1; return load() }

  async function reload() {
    const loaded = await list.load()
    if (loaded && !items.value.length && page.value > 1) return go(pageCount.value)
    return loaded
  }

  async function decide(member: Membership, decision: 'approve' | 'reject' | 'remove', reason: string) {
    if (!canManage.value) return false
    const names = { approve: '已批准', reject: '已驳回', remove: '已移除' } as const
    const ok = await action.run(async () => {
      await api.decideMember(organizationId.value, member.id, { action: decision, expectedVersion: member.version, reason })
    }, `${names[decision]}成员「${member.displayName}」。`)
    if (ok) stale.value = (await reload()) ? '' : '操作已生效，但名单刷新失败，当前显示可能不是最新。请只重新读取，不要重复提交。'
    return ok
  }
  return { page, keyword, items, canManage, total, pageCount, filtering, list, action, stale, load, go, search, decide }
}

/** 邀请列表、按昵称/邮箱检索候选人并发起邀请，以及撤销。邀请创建不等于对方已收到或已加入。 */
export function useInvitationManagement(organizationId: Ref<string>, api: OrganizationsApi = organizationsApi) {
  const page = ref(1)
  const list = useLoadable(() => api.invitations(organizationId.value, { page: String(page.value), pageSize: String(PAGE_SIZE) }))
  const search = useLoadable(async () => (await api.candidates(organizationId.value, keyword.value)).items)
  const invite = useAction()
  const revoke = useAction()
  const keyword = ref('')
  const validDays = ref(7)
  const stale = ref('')

  const items = computed<OrganizationInvitation[]>(() => list.data.value?.items ?? [])
  const candidates = computed<Candidate[]>(() => search.data.value ?? [])
  const total = computed(() => list.data.value?.total ?? 0)
  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

  async function load() { stale.value = ''; return list.load() }
  async function go(next: number) { page.value = Math.min(Math.max(1, next), pageCount.value); return load() }
  async function findCandidates() { if (keyword.value.trim().length >= 2) await search.load() }
  async function refresh() { stale.value = (await list.load()) ? '' : '操作已生效，但邀请列表刷新失败，当前显示可能不是最新。请只重新读取，不要重复提交。' }

  async function sendInvitation(candidate: Candidate) {
    const ok = await invite.run(async () => { await api.invite(organizationId.value, candidate.userId, validDays.value) },
      `已向「${candidate.displayName}」发出邀请，等待对方回应；对方不会收到邮件通知。`)
    if (ok) { await refresh(); await search.load() }
    return ok
  }
  async function revokeInvitation(item: OrganizationInvitation, reason: string) {
    const ok = await revoke.run(async () => {
      await api.revokeInvitation(organizationId.value, item.id, { expectedVersion: item.version, reason })
    }, `已撤销对「${item.displayName}」的邀请。`)
    if (ok) await refresh()
    return ok
  }
  return { page, items, total, pageCount, list, search, candidates, keyword, validDays, invite, revoke, stale, load, go, findCandidates, sendInvitation, revokeInvitation }
}
