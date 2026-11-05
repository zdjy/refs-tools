import { computed, ref } from 'vue'
import type { OwnershipTransfer } from '@refs-tools/contracts/organization-ownership'
import { organizationsApi, type OrganizationsApi } from '../../api/organizations.api'
import { useAction, useLoadable } from './organization-primitives'

/**
 * 发给本人的所有权移交请求。接受会把本人变成该组织的负责人，拒绝只结束请求；
 * 两者都带请求版本，陈旧页面不能覆盖已完成的决定。接受成功后通过 `onAccepted` 通知上层
 * 重新读取「我的组织」，因为本人的角色与管理能力已经改变。
 */
export function useIncomingTransfers(api: OrganizationsApi = organizationsApi, onAccepted: () => Promise<unknown> | void = () => {}) {
  const list = useLoadable(async () => (await api.incomingTransfers({ pageSize: '20' })).items)
  const action = useAction()
  const stale = ref('')

  const items = computed<OwnershipTransfer[]>(() => list.data.value ?? [])

  async function load() { stale.value = ''; return list.load() }

  async function respond(item: OwnershipTransfer, accept: boolean) {
    const ok = await action.run(async () => {
      await api.decideTransfer(item.organizationId, item.id, accept ? 'accept' : 'decline', { expectedVersion: item.version })
    }, accept ? `你已成为「${item.organizationName}」的负责人。` : `已拒绝「${item.organizationName}」的所有权移交。`)
    if (!ok) return false
    stale.value = (await list.load()) ? '' : '操作已生效，但移交列表刷新失败，当前显示可能不是最新。请只重新读取，不要重复提交。'
    if (accept) await onAccepted()
    return true
  }
  return { items, list, action, stale, load, respond }
}
