import { computed, ref, type Ref } from 'vue'
import type { MyOrganization, OrganizationProfileUpdated } from '@refs-tools/contracts/organization-self'
import { organizationsApi, type OrganizationsApi } from '../../api/organizations.api'
import { useAction } from './organization-primitives'

/**
 * 负责人编辑组织简介。草稿只存在内存，取消即丢弃、不发请求；保存成功后把服务端返回的版本交给
 * `onSaved` 写回工作区，因此再次编辑用的是最新版本，不必为了拿版本号再读一次。
 * 简介未变化时按钮禁用并说明「无需保存」，不发出空写入。
 * 版本冲突后保留草稿，可就地重新读取组织拿到最新版本，再提交同一份简介。
 */
export function useOrganizationProfile(organization: Readonly<Ref<MyOrganization | null>>,
  onSaved: (value: OrganizationProfileUpdated) => void, refresh: () => Promise<boolean>, api: OrganizationsApi = organizationsApi) {
  const editing = ref(false)
  const draft = ref('')
  const reloading = ref(false)
  const action = useAction()

  const trimmed = computed(() => draft.value.trim())
  const canSave = computed(() => !!organization.value && trimmed.value !== '' && trimmed.value !== organization.value.purpose)
  const notice = computed(() => trimmed.value !== '' && trimmed.value === organization.value?.purpose ? '简介没有变化，无需保存。' : '')

  function open() {
    draft.value = organization.value?.purpose ?? ''
    action.reset()
    editing.value = true
  }
  /** 提交期间不关闭表单：请求已有结果前丢弃草稿会让用户以为没保存。 */
  function close() {
    if (action.busy.value) return
    editing.value = false
    action.reset()
  }

  async function save(): Promise<boolean> {
    const current = organization.value
    if (!current || !canSave.value) return false
    const ok = await action.run(async () => {
      onSaved(await api.updateProfile(current.id, { purpose: trimmed.value, expectedVersion: current.version }))
    }, '组织简介已更新。')
    if (ok) editing.value = false
    return ok
  }

  /** 重新读取组织，更新版本与当前简介后清除错误；草稿与编辑态保持不变。 */
  async function reload(): Promise<boolean> {
    if (reloading.value || action.busy.value) return false
    reloading.value = true
    try {
      const ok = await refresh()
      if (ok) action.reset()
      else action.error.value = '重新读取失败，请检查网络后重试。'
      return ok
    } finally { reloading.value = false }
  }
  return { editing, draft, notice, canSave, reloading, action, open, close, save, reload }
}
