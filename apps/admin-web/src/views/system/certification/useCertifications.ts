import { computed, getCurrentInstance, onBeforeUnmount, onMounted, ref } from 'vue';
import type { Certification, CertificationAppeal, CertificationAppealDecision, CertificationDecision, CertificationHistory, CertificationReviewSummary, CertificationStatus } from '@refs-tools/contracts/certifications';
import { certificationsApi } from '../../../api/system/certifications';
import { decisionLabels, errorMessage } from './certifications.presentation';

/** 平台审核局部状态；请求代次隔离切换，写入成功与刷新失败分别反馈。 */
export function useCertifications(api = certificationsApi) {
  const tab = ref<'review' | 'records' | 'appeal'>('review'), page = ref(1), total = ref(0);
  const status = ref<CertificationStatus | null>(null), items = ref<CertificationReviewSummary[]>([]);
  const selected = ref<CertificationReviewSummary | null>(null), record = ref<Certification | null>(null);
  const appeals = ref<CertificationAppeal[]>([]), history = ref<CertificationHistory[]>([]);
  const loading = ref(false), detailLoading = ref(false), busy = ref(false);
  const error = ref(''), detailError = ref(''), formError = ref(''), notice = ref(''), stale = ref('');
  const pending = computed(() => appeals.value.find(item => item.status === 'pending') ?? null);
  const next = computed(() => items.value[items.value.findIndex(item => item.id === selected.value?.id) + 1]);
  let listSequence = 0, detailSequence = 0, selectedAppealId: string | undefined;
  async function load(nextPage = page.value) {
    const current = ++listSequence; page.value = nextPage; loading.value = true; error.value = '';
    try {
      const result = await api.queue(tab.value, { page: String(page.value), pageSize: '20', ...(tab.value === 'records' && status.value ? { status: status.value } : {}) });
      if (current !== listSequence) return false;
      items.value = result.items; total.value = result.total; return true;
    } catch (cause) { if (current === listSequence) error.value = errorMessage(cause); return false; }
    finally { if (current === listSequence) loading.value = false; }
  }
  async function readSelected() {
    const target = selected.value, current = ++detailSequence;
    if (!target) return false;
    detailLoading.value = true; detailError.value = '';
    try {
      const list = await api.appeals(target.id, { pageSize: '100' });
      if (current !== detailSequence) return false;
      appeals.value = list.items;
      if (tab.value === 'appeal') selectedAppealId = pending.value?.id ?? selectedAppealId;
      const application = selectedAppealId ? await api.application(target.id, selectedAppealId) : await api.detail(target.id);
      if (current !== detailSequence) return false;
      record.value = application;
      const versions = await api.history(target.id, { pageSize: '100' });
      if (current !== detailSequence) return false;
      history.value = versions.items; stale.value = ''; return true;
    } catch (cause) { if (current === detailSequence) detailError.value = errorMessage(cause); return false; }
    finally { if (current === detailSequence) detailLoading.value = false; }
  }
  async function open(item: CertificationReviewSummary) {
    if (busy.value) return;
    detailSequence++; selected.value = item; record.value = null; appeals.value = []; history.value = [];
    selectedAppealId = undefined; formError.value = ''; notice.value = ''; stale.value = '';
    await readSelected();
  }
  function close() {
    if (busy.value) return;
    detailSequence++; selected.value = null; record.value = null; appeals.value = []; history.value = []; detailLoading.value = false;
  }
  async function changeTab(value: 'review' | 'records' | 'appeal') {
    if (busy.value) return;
    close(); tab.value = value; status.value = null; items.value = []; await load(1);
  }
  async function decide(decision: CertificationDecision['decision'] | CertificationAppealDecision['decision'], reason: string) {
    if (!record.value || busy.value) return false;
    if (tab.value === 'appeal' && !pending.value) { formError.value = '申诉已处理，请重新读取。'; return false; }
    if (!reason.trim() || reason.trim().length > 500) { formError.value = '请填写 1–500 字的具体理由。'; return false; }
    busy.value = true; formError.value = ''; notice.value = ''; stale.value = '';
    try {
      const target = record.value;
      if (tab.value === 'appeal' && pending.value) await api.decideAppeal(target.id, pending.value.id, { expectedVersion: target.version, decision: decision as CertificationAppealDecision['decision'], reason: reason.trim() });
      else record.value = await api.decide(target.id, { expectedVersion: target.version, decision: decision as CertificationDecision['decision'], reason: reason.trim() });
      notice.value = `已完成：${decisionLabels[decision]}。`;
      const [listed, detailed] = await Promise.all([load(), readSelected()]);
      if (!listed || !detailed) stale.value = '决定已生效，但页面刷新失败。请只重新读取，不要重复提交。';
      return true;
    } catch (cause) { formError.value = errorMessage(cause, true); return false; }
    finally { busy.value = false; }
  }
  if (getCurrentInstance()) {
    onMounted(() => { void load(); });
    onBeforeUnmount(() => { listSequence++; detailSequence++; });
  }
  return { tab, page, total, status, items, selected, record, appeals, history, pending, next, loading, detailLoading, busy,
    error, detailError, formError, notice, stale, load, readSelected, open, close, changeTab, decide };
}
