import { computed, ref, type Ref } from 'vue'
import type { JoinCode } from '@refs-tools/contracts/organization-access'
import { organizationsApi, type OrganizationsApi } from '../../api/organizations.api'
import { useAction, useLoadable } from './organization-primitives'

/**
 * 成员码管理。明文只存在于 `revealed`（内存），用户关闭、切换组织或离开页面即清除；
 * 不写入 localStorage、不进入路由或日志。丢失后只能撤销并重新生成。
 */
export function useJoinCodes(organizationId: Ref<string>, api: OrganizationsApi = organizationsApi) {
  const list = useLoadable(async () => (await api.joinCodes(organizationId.value)).items)
  const create = useAction()
  const revoke = useAction()
  const validDays = ref(7)
  const maxUses = ref(1)
  const revealed = ref<{ token: string; code: JoinCode } | null>(null)
  const copyNotice = ref('')
  const stale = ref('')

  const items = computed<JoinCode[]>(() => list.data.value ?? [])

  async function load() { stale.value = ''; return list.load() }
  function dismiss() { revealed.value = null; copyNotice.value = '' }
  function clear() { dismiss(); list.clear(); stale.value = '' }

  async function generate() {
    dismiss()
    const ok = await create.run(async () => {
      revealed.value = await api.createJoinCode(organizationId.value, { validDays: validDays.value, maxUses: maxUses.value })
    }, '成员码已生成，请立即复制保存；关闭后无法再次查看。')
    if (ok) stale.value = (await list.load()) ? '' : '成员码已生成，但列表刷新失败。请只重新读取，不要重复生成。'
    return ok
  }

  async function revokeCode(code: JoinCode) {
    const ok = await revoke.run(async () => { await api.revokeJoinCode(organizationId.value, code.id, code.version) },
      `已撤销以「${code.hint}」结尾的成员码。`)
    if (ok) stale.value = (await list.load()) ? '' : '成员码已撤销，但列表刷新失败，当前显示可能不是最新。'
    return ok
  }

  /** 复制失败（权限或不安全上下文）时说明手动复制的替代路径，不假装已复制。 */
  async function copy() {
    if (!revealed.value) return
    try {
      await navigator.clipboard.writeText(revealed.value.token)
      copyNotice.value = '已复制到剪贴板。'
    } catch {
      copyNotice.value = '浏览器未允许自动复制，请选中上方成员码手动复制。'
    }
  }

  return { items, list, create, revoke, validDays, maxUses, revealed, copyNotice, stale, load, dismiss, clear, generate, revokeCode, copy }
}
