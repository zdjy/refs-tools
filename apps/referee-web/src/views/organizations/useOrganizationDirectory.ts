import { computed, ref } from 'vue'
import type { DirectoryItem } from '@refs-tools/contracts/organization-self'
import { organizationsApi, type OrganizationsApi } from '../../api/organizations.api'
import { useAction, useLoadable } from './organization-primitives'

/** 成员码明文格式，与契约 `JOIN_CODE_PATTERN` 一致；格式不符时不发请求，避免无谓往返。 */
const TOKEN_FORMAT = /^rj_[A-Za-z0-9_-]{43}$/

/** 公开目录检索、申请加入与成员码兑换。目录只含公开字段，不含成员名单。 */
export function useOrganizationDirectory(api: OrganizationsApi = organizationsApi) {
  const keyword = ref('')
  const page = ref(1)
  const directory = useLoadable(() => {
    const text = keyword.value.trim()
    return api.directory({ ...(text ? { keyword: text } : {}), page: String(page.value), pageSize: '10' })
  })
  const join = useAction()
  const redeem = useAction()
  const token = ref('')
  const tokenError = ref('')
  const joined = ref<string | null>(null)

  const items = computed<DirectoryItem[]>(() => directory.data.value?.items ?? [])
  const total = computed(() => directory.data.value?.total ?? 0)
  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / 10)))

  async function search() { page.value = 1; await directory.load() }
  async function go(next: number) { page.value = Math.min(Math.max(1, next), pageCount.value); await directory.load() }

  /** 申请成功后只更新当前页，不改变用户已输入的检索词与页码。 */
  async function requestJoin(item: DirectoryItem) {
    const ok = await join.run(async () => { await api.requestMembership(item.id) }, `已向「${item.name}」提交加入申请，等待组织管理者审核。`)
    if (ok) await directory.load()
    return ok
  }

  async function redeemToken() {
    tokenError.value = ''
    const value = token.value.trim()
    if (!TOKEN_FORMAT.test(value)) { tokenError.value = '成员码格式不正确，请完整粘贴以 rj_ 开头的成员码。'; return false }
    const ok = await redeem.run(async () => { joined.value = (await api.redeemCode(value)).organizationId }, '已通过成员码加入组织。')
    if (ok) token.value = ''
    return ok
  }

  return { keyword, page, items, total, pageCount, directory, join, redeem, token, tokenError, joined, search, go, requestJoin, redeemToken }
}
