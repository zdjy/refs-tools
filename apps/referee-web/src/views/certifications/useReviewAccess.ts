import { computed, type Ref } from 'vue'
import type { MyOrganization } from '@refs-tools/contracts/organization-self'
import { organizationsApi, type OrganizationsApi } from '../../api/organizations.api'
import { useCertificationLoadable } from './useCertificationState'

/**
 * 组织认证审核入口的可见性。certifier 可审核普通认证，owner 可复核申诉；
 * 这里只决定界面入口，每次队列读取与决定仍由 API 独立授权。
 */
export function useReviewAccess(organizationId: Ref<string>, api: OrganizationsApi = organizationsApi) {
  const mine = useCertificationLoadable(async () => (await api.mine({ pageSize: '100' })).items)
  const organization = computed<MyOrganization | null>(() => mine.data.value?.find((item) => item.id === organizationId.value) ?? null)
  const isCertifier = computed(() => organization.value?.roles.includes('certifier') ?? false)
  const isOwner = computed(() => organization.value?.isOwner ?? false)
  const hasAccess = computed(() => isCertifier.value || isOwner.value)
  const tabs = computed(() => {
    const items: { id: 'review' | 'records' | 'appeal'; label: string }[] = []
    if (isCertifier.value) items.push({ id: 'review', label: '待审核' }, { id: 'records', label: '认证记录' })
    if (isOwner.value) items.push({ id: 'appeal', label: '待复核' })
    return items
  })

  async function load() { return mine.load() }
  return { mine, organization, isCertifier, isOwner, hasAccess, tabs, load }
}
