import { computed, ref, type Ref } from 'vue'
import type { GrantRole, OrganizationRole } from '@refs-tools/contracts/organization-access'
import { organizationsApi, type OrganizationsApi } from '../../api/organizations.api'
import { roleLabels } from './organizations.presentation'
import { useAction, useLoadable } from './organization-primitives'

/** 组织角色名单与授予/撤销。能否授予由服务端 `canGrant` 决定，仅 owner 为 true。 */
export function useOrganizationRoles(organizationId: Ref<string>, api: OrganizationsApi = organizationsApi) {
  const list = useLoadable(() => api.roles(organizationId.value))
  const grant = useAction()
  const revoke = useAction()
  const stale = ref('')

  const items = computed<OrganizationRole[]>(() => list.data.value?.items ?? [])
  const canGrant = computed(() => list.data.value?.canGrant ?? false)

  async function load() { stale.value = ''; return list.load() }
  async function refresh() { stale.value = (await list.load()) ? '' : '操作已生效，但角色列表刷新失败，当前显示可能不是最新。请只重新读取，不要重复提交。' }

  async function grantRole(body: GrantRole, displayName: string) {
    const ok = await grant.run(async () => { await api.grantRole(organizationId.value, body) },
      `已授予「${displayName}」${roleLabels[body.role]}角色。`)
    if (ok) await refresh()
    return ok
  }

  async function revokeRole(item: OrganizationRole) {
    const ok = await revoke.run(async () => { await api.revokeRole(organizationId.value, item.id) },
      `已撤销「${item.displayName}」的${roleLabels[item.role]}角色。`)
    if (ok) await refresh()
    return ok
  }
  return { items, canGrant, list, grant, revoke, stale, load, grantRole, revokeRole }
}
