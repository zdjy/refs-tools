import { computed, ref } from 'vue'
import type {
  Certification, CertificationAppeal, CertificationHistory, CertificationSummary, CreateCertification, UpdateCertification,
} from '@refs-tools/contracts/certifications'
import type { Paged } from '@refs-tools/contracts/pagination'
import type { MyOrganization } from '@refs-tools/contracts/organization-self'
import { certificationsApi, type CertificationsApi } from '../../api/certifications.api'
import { organizationsApi, type OrganizationsApi } from '../../api/organizations.api'
import { useCertificationAction, useCertificationLoadable } from './useCertificationState'

const PAGE_SIZE = '20'

/**
 * 裁判端认证工作台：本人当前认证、详情、历史与申诉，以及组织/平台范围的前置条件。
 * 列表与详情分开读取；写入成功后刷新列表和当前详情，刷新失败只提示陈旧，不把成功说成失败。
 */
export function useCertifications(api: CertificationsApi = certificationsApi, orgApi: OrganizationsApi = organizationsApi) {
  const page = ref(1)
  const selectedId = ref<string | null>(null)
  const mine = useCertificationLoadable(async () => api.mine({ page: String(page.value), pageSize: PAGE_SIZE }))
  const organizations = useCertificationLoadable(async () => (await orgApi.mine({ pageSize: '100' })).items)
  const detail = useCertificationLoadable(async () => {
    if (!selectedId.value) throw new Error('missing certification id')
    return api.detail(selectedId.value)
  })
  const history = useCertificationLoadable(async () => {
    if (!selectedId.value) throw new Error('missing certification id')
    return api.history(selectedId.value, { pageSize: '50' })
  })
  const appeals = useCertificationLoadable(async () => {
    if (!selectedId.value) throw new Error('missing certification id')
    return api.appeals(selectedId.value, { pageSize: '20' })
  })
  const action = useCertificationAction()
  const stale = ref('')

  const items = computed<CertificationSummary[]>(() => mine.data.value?.items ?? [])
  const pageCount = computed(() => Math.max(1, Math.ceil((mine.data.value?.total ?? 0) / Number(PAGE_SIZE))))
  const orgItems = computed<MyOrganization[]>(() => organizations.data.value ?? [])
  const activeOrganizations = computed(() => orgItems.value.filter((item) => item.status === 'active' && item.membership?.status === 'active'))
  const orgNames = computed<Record<string, string>>(() => Object.fromEntries(orgItems.value.map((item) => [item.id, item.name])))
  const platformEligible = computed(() => items.value.some((item) => item.scope.type === 'organization' && item.effectiveStatus === 'approved'))
  const loading = computed(() => mine.loading.value && mine.data.value === null)
  const loadError = computed(() => mine.error.value || organizations.error.value)
  const selectedRecord = computed<Certification | null>(() => detail.data.value)
  const historyItems = computed<CertificationHistory[]>(() => history.data.value?.items ?? [])
  const appealItems = computed<CertificationAppeal[]>(() => appeals.data.value?.items ?? [])

  async function load() {
    stale.value = ''
    await Promise.all([mine.load(), organizations.load()])
  }
  async function go(next: number) {
    page.value = Math.min(Math.max(1, next), pageCount.value)
    return mine.load()
  }
  async function refreshSelected() {
    if (!selectedId.value) return false
    const [d, h, a] = await Promise.all([detail.load(), history.load(), appeals.load()])
    return d && h && a
  }
  async function refreshAfterWrite() {
    const [list, current] = await Promise.all([mine.load(), refreshSelected()])
    stale.value = list && current ? '' : '操作已生效，但当前页面刷新失败，显示的可能是旧数据。请只重新读取，不要重复提交。'
  }
  async function open(item: Pick<CertificationSummary, 'id'>) {
    selectedId.value = item.id
    detail.clear(); history.clear(); appeals.clear()
    stale.value = ''
    return refreshSelected()
  }
  function close() {
    selectedId.value = null
    detail.clear(); history.clear(); appeals.clear()
  }

  async function createDraft(body: CreateCertification) {
    let created: Certification | null = null
    const ok = await action.run(async () => {
      const saved = await api.create(body, crypto.randomUUID())
      created = saved
      selectedId.value = saved.id
    }, '认证草稿已保存。请核对材料后提交审核。')
    if (ok && created) await refreshAfterWrite()
    return ok
  }
  async function updateDraft(record: Certification, body: UpdateCertification) {
    const ok = await action.run(async () => {
      const updated = await api.update(record.id, body)
      detail.data.value = updated
    }, '材料已保存为新版本。')
    if (ok) await refreshAfterWrite()
    return ok
  }
  async function submit(record: Certification) {
    const ok = await action.run(async () => {
      detail.data.value = await api.submit(record.id, record.version)
    }, '已提交审核，等待认证员处理。')
    if (ok) await refreshAfterWrite()
    return ok
  }
  async function appeal(record: Certification, body: { reason: string; evidenceMediaIds: string[] }) {
    const ok = await action.run(async () => {
      await api.createAppeal(record.id, { ...body, expectedVersion: record.version })
    }, '申诉已提交，等待独立复核。')
    if (ok) await refreshAfterWrite()
    return ok
  }
  return {
    page, pageCount, mine, organizations, activeOrganizations, platformEligible, orgNames, items, loading, loadError,
    selectedId, selectedRecord, historyItems, appealItems, detail, history, appeals, action, stale,
    load, go, open, close, createDraft, updateDraft, submit, appeal,
  }
}
