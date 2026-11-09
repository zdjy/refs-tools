import { ref, type Ref } from 'vue'
import type { MemberContact, Membership } from '@refs-tools/contracts/organization-members'
import { mediaApi, type MediaApi } from '../../api/media.api'
import { organizationsApi, type OrganizationsApi } from '../../api/organizations.api'
import { memberContactErrorMessage } from './organizations.presentation'

/**
 * 成员详情读取状态：联系方式与头像均按需读取，弹窗关闭时清空，避免私有资料停留在内存。
 * 头像签名失败只降级为首字，不影响联系方式；读取失败保留重试入口，不冒充空资料。
 * 触发元素在打开时记录，关闭后恢复焦点；列表刷新可能移除该行，因此恢复前检查 isConnected。
 */
export function useMemberContact(organizationId: Ref<string>, api: OrganizationsApi = organizationsApi,
  media: Pick<MediaApi, 'readUrl'> = mediaApi) {
  const target = ref<Membership | null>(null)
  const data = ref<MemberContact | null>(null)
  const avatarUrl = ref('')
  const visible = ref(false)
  const loading = ref(false)
  const error = ref('')
  let revision = 0
  let trigger: HTMLElement | null = null

  function open(member: Membership) {
    // 单测运行在无 DOM 的 node 环境，此时没有可记录的触发元素。
    const active = typeof document === 'undefined' ? null : document.activeElement
    trigger = active && 'focus' in active ? (active as HTMLElement) : null
    target.value = member
    visible.value = true
    void load(member)
  }

  async function load(member: Membership) {
    const current = ++revision
    data.value = null
    avatarUrl.value = ''
    error.value = ''
    loading.value = true
    try {
      const contact = await api.memberContact(organizationId.value, member.id)
      if (current !== revision) return
      data.value = contact
      // 联系方式先呈现；头像签名单独完成，较慢或失败都不阻塞资料展示。
      if (contact.avatarMediaId) {
        void media.readUrl(contact.avatarMediaId).then((authorization) => {
          if (current === revision) avatarUrl.value = authorization.url
        }).catch(() => {
          // 头像不可读时降级为昵称首字，联系方式已经成功返回，不整体报错。
          if (current === revision) avatarUrl.value = ''
        })
      }
    } catch (cause) {
      if (current === revision) error.value = memberContactErrorMessage(cause)
    } finally {
      if (current === revision) loading.value = false
    }
  }

  function retry() {
    if (target.value) void load(target.value)
  }

  function close() {
    revision++
    visible.value = false
    target.value = null
    data.value = null
    avatarUrl.value = ''
    error.value = ''
    loading.value = false
    if (trigger?.isConnected) trigger.focus({ preventScroll: true })
    trigger = null
  }

  return { target, data, avatarUrl, visible, loading, error, open, retry, close }
}
