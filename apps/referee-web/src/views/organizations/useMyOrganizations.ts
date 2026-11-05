import { computed, ref } from 'vue'
import type { OrganizationInvitation } from '@refs-tools/contracts/organization-members'
import type { MyOrganization } from '@refs-tools/contracts/organization-self'
import { organizationsApi, type OrganizationsApi } from '../../api/organizations.api'
import { useAction, useLoadable } from './organization-primitives'

/**
 * 「我的组织」枢纽：本人的组织与收到的待回应邀请。
 * 写入成功但随后刷新失败时保留成功事实并提示数据可能陈旧，只重试读取，不诱导重复写入。
 */
export function useMyOrganizations(api: OrganizationsApi = organizationsApi) {
  const organizations = useLoadable(async () => (await api.mine()).items)
  const inbox = useLoadable(async () => (await api.inbox({ pageSize: '20' })).items.filter(item => item.status === 'pending'))
  const action = useAction()
  const stale = ref('')

  const items = computed<MyOrganization[]>(() => organizations.data.value ?? [])
  const invitations = computed<OrganizationInvitation[]>(() => inbox.data.value ?? [])
  const loading = computed(() => organizations.loading.value && organizations.data.value === null)
  const loadError = computed(() => organizations.error.value || inbox.error.value)

  async function load() {
    stale.value = ''
    await Promise.all([organizations.load(), inbox.load()])
  }

  async function refreshAfterWrite() {
    const [a, b] = await Promise.all([organizations.load(), inbox.load()])
    stale.value = a && b ? '' : '操作已生效，但列表刷新失败，当前显示可能不是最新。请只重新读取，不要重复提交。'
  }

  async function respond(invitation: OrganizationInvitation, accept: boolean) {
    const ok = await action.run(async () => {
      if (accept) await api.acceptInvitation(invitation.organizationId, invitation.id)
      else await api.declineInvitation(invitation.organizationId, invitation.id)
    }, accept ? `已加入「${invitation.organizationName}」。` : `已拒绝「${invitation.organizationName}」的邀请。`)
    if (ok) await refreshAfterWrite()
    return ok
  }

  return { items, invitations, loading, loadError, stale, action, load, respond }
}
