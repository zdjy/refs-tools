import { getCurrentInstance, onBeforeUnmount, onMounted, ref } from 'vue';
import type { AdminMedia } from '@refs-tools/contracts/admin-media';
import { mediaApi, MediaApiError } from '../../../api/system/media';

function message(error: unknown) {
  const messages: Record<string, string> = {
    OFFLINE: '当前处于离线状态，操作未提交，恢复网络后再试', NETWORK_ERROR: '网络连接失败或超时，请检查网络后重试；写入类操作请先刷新确认是否已生效', UNAUTHENTICATED: '登录已失效，请重新登录',
    FORBIDDEN: '当前账号没有平台文件管理权限', EMAIL_NOT_VERIFIED: '请先验证邮箱',
    NOT_FOUND: '文件记录不存在，请刷新列表', MEDIA_NOT_AVAILABLE: '文件当前不可下载，请重新读取详情',
    MEDIA_RETENTION_REQUIRED: '此文件为已核验留存证据，须由所属业务审批删除', REASON_REQUIRED: '请填写操作理由',
    INVALID_AUDIT_EVENT: '理由不能包含凭据、密码或 URL', INVALID_REQUEST: '筛选或操作参数不符合要求，请检查输入',
  };
  return error instanceof MediaApiError ? messages[error.code] ?? '操作失败，请稍后重试' : '操作失败，请稍后重试';
}

/**
 * 局部内存状态；以请求代次隔离列表和详情，不存储下载授权。
 *
 * 下载与删除是两条独立流程：下载理由在详情弹窗内填写，
 * 删除理由在列表行触发的独立删除弹窗内填写（FS-0010 v2 §5.2）。
 */
export function useFiles(api = mediaApi) {
  const items = ref<AdminMedia[]>([]), total = ref(0), page = ref(1), keyword = ref(''), ownerKeyword = ref('');
  const purpose = ref<AdminMedia['purpose'] | null>(null), status = ref<AdminMedia['status'] | null>(null);
  const selected = ref<AdminMedia | null>(null), selectedId = ref(''), showing = ref(false);
  const loading = ref(false), detailLoading = ref(false), busy = ref(false);
  const reason = ref(''), error = ref(''), formError = ref(''), notice = ref('');
  /** 删除流程独立于详情弹窗：目标、理由与错误各自隔离。 */
  const deleteTarget = ref<AdminMedia | null>(null), deleteReason = ref(''), deleteError = ref('');
  const online = ref(typeof navigator === 'undefined' || navigator.onLine);
  let listSequence = 0, detailSequence = 0, disposed = false;

  async function load(nextPage = page.value) {
    const sequence = ++listSequence;
    page.value = nextPage; loading.value = true; error.value = '';
    try {
      const result = await api.list({ keyword: keyword.value.trim(), page: String(nextPage),
        ...(ownerKeyword.value.trim() ? { ownerKeyword: ownerKeyword.value.trim() } : {}),
        ...(purpose.value ? { purpose: purpose.value } : {}), ...(status.value ? { status: status.value } : {}) });
      if (sequence !== listSequence) return;
      items.value = result.items; total.value = result.total;
    } catch (e) { if (sequence === listSequence) error.value = message(e); }
    finally { if (sequence === listSequence) loading.value = false; }
  }

  async function open(id: string) {
    if (busy.value) return;
    const sequence = ++detailSequence;
    selectedId.value = id; selected.value = null; showing.value = true; detailLoading.value = true;
    reason.value = ''; formError.value = ''; notice.value = '';
    try { const result = await api.detail(id); if (sequence === detailSequence) selected.value = result; }
    catch (e) { if (sequence === detailSequence) formError.value = message(e); }
    finally { if (sequence === detailSequence) detailLoading.value = false; }
  }

  function close() {
    if (busy.value) return;
    detailSequence++; showing.value = false; selected.value = null; reason.value = ''; formError.value = '';
    detailLoading.value = false;
  }

  async function download(deliver: (url: string) => void) {
    if (!selected.value || busy.value || !online.value || selected.value.status !== 'available') return;
    if (!reason.value.trim()) { formError.value = '请填写操作理由'; return; }
    busy.value = true; formError.value = ''; notice.value = '';
    try {
      const authorization = await api.read(selected.value.id, { reason: reason.value.trim() });
      if (!disposed) { deliver(authorization.url); notice.value = '下载授权已签发，浏览器将直接从对象存储下载；不代表下载已完成。'; }
    } catch (e) { if (!disposed) formError.value = message(e); }
    finally { busy.value = false; }
  }

  /** 行内删除入口：只登记目标并打开独立删除弹窗，未填理由不会提交。 */
  function askRemove(media: AdminMedia) {
    if (busy.value || !online.value) return;
    deleteTarget.value = media; deleteReason.value = ''; deleteError.value = '';
  }

  function cancelRemove() {
    if (busy.value) return;
    deleteTarget.value = null; deleteReason.value = ''; deleteError.value = '';
  }

  async function submitRemove() {
    const target = deleteTarget.value;
    if (!target || busy.value || !online.value) return;
    if (!deleteReason.value.trim()) { deleteError.value = '请填写删除理由，说明本次操作的必要性'; return; }
    busy.value = true; deleteError.value = '';
    try {
      await api.remove(target.id, { reason: deleteReason.value.trim() });
      if (disposed) return;
      deleteTarget.value = null; deleteReason.value = '';
      notice.value = '文件访问已撤销，对象删除请求已完成。';
      // 详情弹窗指向同一文件时同步刷新，避免展示已陈旧的删除时间。
      if (selectedId.value === target.id && showing.value) {
        try { const current = await api.detail(target.id); if (!disposed) selected.value = current; }
        catch { if (!disposed) formError.value = '删除请求已完成，但详情刷新失败，请重新读取详情。'; }
      }
      await load();
    } catch (e) {
      if (!disposed) deleteError.value = `${message(e)}。删除失败时访问可能已撤销，请重新读取详情或重试删除，不要视为已清理。`;
    } finally { busy.value = false; }
  }

  function reset() { keyword.value = ''; ownerKeyword.value = ''; purpose.value = null; status.value = null; void load(1); }
  function updateOnline() { online.value = navigator.onLine; }
  if (getCurrentInstance()) {
    onMounted(() => { window.addEventListener('online', updateOnline); window.addEventListener('offline', updateOnline); void load(); });
    onBeforeUnmount(() => {
      disposed = true; listSequence++; detailSequence++; items.value = []; selected.value = null; reason.value = '';
      deleteTarget.value = null; deleteReason.value = '';
      window.removeEventListener('online', updateOnline); window.removeEventListener('offline', updateOnline);
    });
  }
  return { items, total, page, keyword, ownerKeyword, purpose, status, selected, selectedId, showing, loading, detailLoading,
    busy, reason, error, formError, notice, deleteTarget, deleteReason, deleteError, online, load, reset, open, close,
    download, askRemove, cancelRemove, submitRemove };
}
