import { computed, ref, type Ref } from 'vue'
import type {
  Certification, CertificationAppeal, CertificationDecision, CertificationHistory, CertificationSummary,
} from '@refs-tools/contracts/certifications'
import type { Paged } from '@refs-tools/contracts/pagination'
import { certificationsApi, type CertificationsApi } from '../../api/certifications.api'
import { decisionLabels, pendingAppeal } from './certifications.presentation'
import { useCertificationAction, useCertificationLoadable } from './useCertificationState'

const PAGE_SIZE = '20'
const emptyPage = <T>(): Paged<T> => ({ items: [], total: 0, page: 1, pageSize: Number(PAGE_SIZE) })

/**
 * 组织侧认证审核：certifier 的待审队列与 owner 的申诉复核队列。
 * 两个队列只在具备对应能力时请求，避免无权角色看到误导性的 403；
 * 选中记录后单独读取详情、历史与申诉，决定成功后刷新队列与当前详情。
 */
export function useReviewQueues(
  organizationId: Ref<string>, access: { isCertifier: Ref<boolean>; isOwner: Ref<boolean> }, api: CertificationsApi = certificationsApi,
) {
  const tab = ref<'review' | 'appeal'>('review')
  const reviewPage = ref(1)
  const appealPage = ref(1)
  const selectedId = ref<string | null>(null)
  // 负责人没有 certifier 权限，不能用普通详情/历史入口；申诉复核改用 application 入口读取当前申请。
  const selectedAppealId = ref<string | null>(null)
  const queue = useCertificationLoadable(async () =>
    access.isCertifier.value ? api.reviewQueue(organizationId.value, { page: String(reviewPage.value), pageSize: PAGE_SIZE }) : emptyPage<CertificationSummary>())
  const appealQueue = useCertificationLoadable(async () =>
    access.isOwner.value ? api.appealQueue(organizationId.value, { page: String(appealPage.value), pageSize: PAGE_SIZE }) : emptyPage<CertificationSummary>())
  const detail = useCertificationLoadable(async () => {
    if (!selectedId.value) throw new Error('missing certification id')
    if (selectedAppealId.value) return api.appealApplication(selectedId.value, selectedAppealId.value)
    return api.detail(selectedId.value)
  })
  const history = useCertificationLoadable(async () => {
    if (!selectedId.value) throw new Error('missing certification id')
    return api.history(selectedId.value, { pageSize: '50' })
  })
  const appeals = useCertificationLoadable(async () => {
    if (!selectedId.value) throw new Error('missing certification id')
    // 普通认证员没有申诉读取权限；只有负责人复核时才请求，避免用 404 冒充记录失效。
    if (!access.isOwner.value) return emptyPage<CertificationAppeal>()
    return api.appeals(selectedId.value, { pageSize: '20' })
  })
  const action = useCertificationAction()
  const stale = ref('')

  const queueItems = computed<CertificationSummary[]>(() => queue.data.value?.items ?? [])
  const appealItems = computed<CertificationSummary[]>(() => appealQueue.data.value?.items ?? [])
  const currentItems = computed(() => tab.value === 'review' ? queueItems.value : appealItems.value)
  const reviewPageCount = computed(() => Math.max(1, Math.ceil((queue.data.value?.total ?? 0) / Number(PAGE_SIZE))))
  const appealPageCount = computed(() => Math.max(1, Math.ceil((appealQueue.data.value?.total ?? 0) / Number(PAGE_SIZE))))
  const record = computed<Certification | null>(() => detail.data.value)
  const historyItems = computed<CertificationHistory[]>(() => history.data.value?.items ?? [])
  const appealList = computed<CertificationAppeal[]>(() => appeals.data.value?.items ?? [])
  const openAppeal = computed(() => pendingAppeal(appealList.value))

  async function load() {
    stale.value = ''
    await Promise.all([queue.load(), appealQueue.load()])
  }
  async function go(next: number) {
    if (tab.value === 'review') reviewPage.value = Math.min(Math.max(1, next), reviewPageCount.value)
    else appealPage.value = Math.min(Math.max(1, next), appealPageCount.value)
    return tab.value === 'review' ? queue.load() : appealQueue.load()
  }
  /** 先读申诉（负责人可读），再决定用普通详情还是申诉 application 入口；历史仍只对 certifier 读取。 */
  async function refreshSelected() {
    if (!selectedId.value) return false
    const a = await appeals.load()
    // 决定后申诉不再是 pending，但复核人仍可用 application 入口查看已处理材料，因此保留上次申诉 ID。
    const pending = access.isOwner.value ? pendingAppeal(appeals.data.value?.items ?? []) : null
    if (pending) selectedAppealId.value = pending.id
    const d = await detail.load()
    const h = access.isCertifier.value ? await history.load() : true
    return d && h && a
  }
  async function open(item: Pick<CertificationSummary, 'id'>) {
    selectedId.value = item.id
    selectedAppealId.value = null
    detail.clear(); history.clear(); appeals.clear()
    stale.value = ''
    return refreshSelected()
  }
  function close() {
    selectedId.value = null
    selectedAppealId.value = null
    detail.clear(); history.clear(); appeals.clear()
  }
  async function refreshAfterWrite() {
    const [a, b, current] = await Promise.all([
      access.isCertifier.value ? queue.load() : Promise.resolve(true),
      access.isOwner.value ? appealQueue.load() : Promise.resolve(true),
      refreshSelected(),
    ])
    stale.value = a && b && current ? '' : '决定已生效，但队列或详情刷新失败。请只重新读取，不要重复提交。'
  }
  async function decide(record: Certification, decision: CertificationDecision['decision'], reason: string) {
    const ok = await action.run(async () => {
      detail.data.value = await api.decide(organizationId.value, record.id, {
        expectedVersion: record.version, decision, reason,
      })
    }, `已${decisionLabels[decision]}「${record.certificateNumber}」。`)
    if (ok) await refreshAfterWrite()
    return ok
  }
  async function decideAppeal(record: Certification, appeal: CertificationAppeal,
    decision: NonNullable<CertificationAppeal['decision']>, reason: string) {
    const ok = await action.run(async () => {
      await api.decideAppeal(record.id, appeal.id, { expectedVersion: record.version, decision, reason })
    }, decision === 'overturn' ? '复核完成：已改判批准。' : decision === 'uphold' ? '复核完成：维持原决定。' : '复核完成：已要求补件。')
    if (ok) await refreshAfterWrite()
    return ok
  }
  return {
    tab, reviewPage, appealPage, queue, appealQueue, queueItems, appealItems, currentItems,
    reviewPageCount, appealPageCount, selectedId, record, historyItems, appealList, openAppeal, detail, history, appeals,
    action, stale, load, go, open, close, decide, decideAppeal,
  }
}
