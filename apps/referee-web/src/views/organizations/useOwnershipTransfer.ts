import { computed, ref, type Ref } from 'vue'
import type { Membership } from '@refs-tools/contracts/organization-members'
import type { OwnershipTransfer } from '@refs-tools/contracts/organization-ownership'
import { organizationsApi, type OrganizationsApi } from '../../api/organizations.api'
import { useAction, useLoadable } from './organization-primitives'

const PAGE_SIZE = 20

/**
 * 负责人发起所有权移交。接收人必须先接受才会换手，因此这里只负责「发起 / 取消 / 查看记录」。
 * 候选人取自本组织成员名单并只保留正式成员，这只是界面便利，新负责人是否合格以服务端校验为准。
 * 写入成功后刷新记录失败时保留成功事实，只提示重新读取，不诱导重复发起。
 */
export function useOwnershipTransfer(organizationId: Ref<string>, ownerUserId: Ref<string>, api: OrganizationsApi = organizationsApi) {
  const keyword = ref('')
  const history = useLoadable(async () => (await api.transfers(organizationId.value, { pageSize: String(PAGE_SIZE) })).items)
  const members = useLoadable(async () => (await api.members(organizationId.value, {
    page: '1', pageSize: String(PAGE_SIZE), keyword: keyword.value.trim() })).items)
  const start = useAction()
  const cancel = useAction()
  const selectedId = ref('')
  const stale = ref('')

  const records = computed<OwnershipTransfer[]>(() => history.data.value ?? [])
  const pending = computed(() => records.value.find(item => item.status === 'pending') ?? null)
  const candidates = computed<Membership[]>(() =>
    (members.data.value ?? []).filter(item => item.status === 'active' && item.userId !== ownerUserId.value))
  const selected = computed(() => candidates.value.find(item => item.userId === selectedId.value) ?? null)

  async function load() { stale.value = ''; return history.load() }
  async function findMembers() { selectedId.value = ''; return members.load() }
  async function refresh(message: string) { stale.value = (await history.load()) ? '' : message }

  async function begin() {
    const target = selected.value
    if (!target) return false
    const ok = await start.run(async () => { await api.startTransfer(organizationId.value, target.userId) },
      `已向「${target.displayName}」发起所有权移交，对方接受后才会生效；对方不会收到邮件通知。`)
    if (ok) { selectedId.value = ''; await refresh('移交请求已发起，但记录刷新失败。请只重新读取，不要重复发起。') }
    return ok
  }
  async function withdraw(item: OwnershipTransfer) {
    const ok = await cancel.run(async () => {
      await api.decideTransfer(organizationId.value, item.id, 'cancel', { expectedVersion: item.version })
    }, `已取消对「${item.toDisplayName}」的所有权移交。`)
    if (ok) await refresh('移交请求已取消，但记录刷新失败。请只重新读取，不要重复提交。')
    return ok
  }
  function clear() { history.clear(); members.clear(); keyword.value = ''; selectedId.value = ''; stale.value = ''; start.reset(); cancel.reset() }
  return { keyword, selectedId, records, pending, candidates, selected, history, members, start, cancel, stale, load, findMembers, begin, withdraw, clear }
}
