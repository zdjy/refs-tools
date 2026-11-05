import { computed, ref, type Ref } from 'vue'
import type { MyOrganization, OrganizationProfileUpdated } from '@refs-tools/contracts/organization-self'
import { organizationsApi, type OrganizationsApi } from '../../api/organizations.api'
import { useAction, useLoadable } from './organization-primitives'

export type WorkspaceTab = 'overview' | 'members' | 'invitations' | 'codes' | 'roles' | 'ownership'

/**
 * 单个组织的工作区：从「我的组织」中取出当前组织与本人成员关系，
 * 能力（canManage / canGrantRoles）由服务端按实时授权计算，界面只据此呈现。
 * 成员管理类标签页是否可见取决于能力，但每次写请求仍由服务端独立授权。
 */
export function useOrganizationWorkspace(organizationId: Ref<string>, api: OrganizationsApi = organizationsApi) {
  const mine = useLoadable(async () => (await api.mine()).items)
  const leave = useAction()
  const tab = ref<WorkspaceTab>('overview')
  const left = ref(false)

  const organization = computed<MyOrganization | null>(() => mine.data.value?.find(item => item.id === organizationId.value) ?? null)
  const notFound = computed(() => mine.data.value !== null && !organization.value && !left.value)
  const tabs = computed<{ id: WorkspaceTab; label: string }[]>(() => {
    const base: { id: WorkspaceTab; label: string }[] = [{ id: 'overview', label: '概览' }]
    if (!organization.value?.canManage) return base
    const managed: { id: WorkspaceTab; label: string }[] = [
      { id: 'members', label: '成员' }, { id: 'invitations', label: '邀请' }, { id: 'codes', label: '成员码' }]
    // 移交所有权只属于负责人：组织者能管理成员但不能移交，服务端同样只认 organization.manage。
    const owner: { id: WorkspaceTab; label: string }[] = organization.value.isOwner ? [{ id: 'ownership', label: '移交' }] : []
    return [...base, ...managed, { id: 'roles', label: '角色' }, ...owner]
  })

  async function load() {
    const ok = await mine.load()
    // 能力被撤销后当前标签页可能不再可见，回到概览，避免停留在已无权限的面板。
    if (ok && !tabs.value.some(item => item.id === tab.value)) tab.value = 'overview'
    return ok
  }

  /**
   * 简介保存后把服务端回执合并进当前列表：简介与版本都取服务端结果，
   * 不再多发一次列表请求，避免「写入成功但刷新失败」的中间态。
   */
  function applyPurpose(value: OrganizationProfileUpdated) {
    if (!mine.data.value) return
    mine.data.value = mine.data.value.map(item =>
      item.id === value.id ? { ...item, purpose: value.purpose, version: value.version } : item)
  }

  /** 退出：pending 申请即「撤回申请」，active 成员即「退出组织」，共用同一接口与版本条件。 */
  async function leaveOrganization(reason: string): Promise<boolean> {
    const current = organization.value
    if (!current?.membership) return false
    const withdraw = current.membership.status === 'pending'
    const ok = await leave.run(async () => {
      await api.leave(current.id, current.membership!.id, { expectedVersion: current.membership!.version, reason })
      left.value = true
    }, withdraw ? `已撤回对「${current.name}」的加入申请。` : `已退出「${current.name}」。`)
    return ok
  }

  return { organization, notFound, tab, tabs, mine, leave, left, load, leaveOrganization, applyPurpose }
}
