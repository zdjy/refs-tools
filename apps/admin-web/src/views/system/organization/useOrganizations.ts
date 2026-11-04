import { getCurrentInstance, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import type { CreateOrganization, Organization, OrganizationDecision, OrganizationDetail } from '@refs-tools/contracts/organizations';
import { organizationsApi, OrganizationsApiError } from '../../../api/system/organizations';

function message(error: unknown) {
  const messages: Record<string, string> = {
    NETWORK_ERROR: '网络连接失败，请检查网络后重试', UNAUTHENTICATED: '登录已失效，请重新登录',
    FORBIDDEN: '当前账号没有平台组织管理权限', NOT_FOUND: '组织不存在，请刷新列表',
    VERSION_CONFLICT: '组织已更新，请重新读取后再操作', INVALID_ORGANIZATION_STATE: '当前状态不允许此操作，请重新读取',
    INVALID_OWNER: '负责人须为有效且邮箱已验证的用户', INVALID_ORGANIZATION: '请完整填写组织与负责人资料',
    INVALID_OWNER_AUTHORITY: '负责人成员关系或所有者角色已失效，请先处理组织治理',
    ROLE_ALREADY_BOUND: '组织已有负责人角色，请核对后再审核', REASON_REQUIRED: '请填写操作理由',
    INVALID_AUDIT_EVENT: '操作理由不能包含凭据、密码或 URL，请修改后重试',
    INVALID_REQUEST: '输入格式不符合要求，请检查后重试',
  };
  return error instanceof OrganizationsApiError ? messages[error.code] ?? '操作失败，请稍后重试' : '操作失败，请稍后重试';
}
const emptyForm = (): CreateOrganization => ({ name: '', region: '', purpose: '', ownerUserId: '', contact: '' });

/** 页面局部状态；请求代次隔离筛选与详情，失败保留输入且不伪报成功。 */
export function useOrganizations(api = organizationsApi) {
  const items = ref<Organization[]>([]), total = ref(0), page = ref(1), keyword = ref('');
  const status = ref<Organization['status'] | null>(null), selected = ref<OrganizationDetail | null>(null), selectedId = ref('');
  const loading = ref(false), detailLoading = ref(false), ready = ref(false), busy = ref(false);
  const error = ref(''), formError = ref(''), notice = ref('');
  const online = ref(typeof navigator === 'undefined' || navigator.onLine);
  const mode = ref<'create' | 'detail' | null>(null), action = ref<OrganizationDecision['action'] | null>(null);
  const reason = ref(''), confirming = ref(false), form = reactive(emptyForm());
  let listSequence = 0, detailSequence = 0;

  async function load(nextPage = page.value) {
    const sequence = ++listSequence;
    page.value = nextPage; loading.value = true; error.value = '';
    try {
      const result = await api.list({ keyword: keyword.value.trim(), ...(status.value ? { status: status.value } : {}), page: String(nextPage), pageSize: '20' });
      if (sequence !== listSequence) return;
      items.value = result.items; total.value = result.total;
    } catch (e) { if (sequence === listSequence) error.value = message(e); }
    finally { if (sequence === listSequence) loading.value = false; }
  }

  function create() {
    if (busy.value) return;
    detailSequence++; detailLoading.value = false; ready.value = true; selected.value = null;
    action.value = null; reason.value = ''; confirming.value = false; formError.value = ''; notice.value = '';
    Object.assign(form, emptyForm()); mode.value = 'create';
  }

  async function open(id: string) {
    if (busy.value) return;
    const sequence = ++detailSequence;
    selectedId.value = id; selected.value = null; ready.value = false; detailLoading.value = true; mode.value = 'detail';
    action.value = null; reason.value = ''; confirming.value = false; formError.value = ''; notice.value = '';
    try {
      const current = await api.detail(id);
      if (sequence === detailSequence) { selected.value = current; ready.value = true; }
    } catch (e) { if (sequence === detailSequence) formError.value = message(e); }
    finally { if (sequence === detailSequence) detailLoading.value = false; }
  }

  function close() {
    if (busy.value) return;
    detailSequence++; mode.value = null; selected.value = null; detailLoading.value = false;
    confirming.value = false; action.value = null; reason.value = ''; Object.assign(form, emptyForm());
  }

  function requestDecision() {
    if (!ready.value || !selected.value || !action.value || !online.value || busy.value) return;
    if (!reason.value.trim()) { formError.value = '请填写操作理由'; return; }
    formError.value = ''; confirming.value = true;
  }

  async function save() {
    if (busy.value || !ready.value || !online.value || mode.value !== 'create') return;
    busy.value = true; formError.value = ''; notice.value = '';
    try { await api.create({ ...form }); mode.value = null; Object.assign(form, emptyForm()); notice.value = '组织申请已录入，等待审核'; await load(1); }
    catch (e) { formError.value = message(e); }
    finally { busy.value = false; }
  }

  async function decide() {
    if (busy.value || !ready.value || !online.value || !selected.value || !action.value || !confirming.value) return;
    busy.value = true; formError.value = ''; notice.value = '';
    try {
      selected.value = await api.decide(selected.value.id, { action: action.value, expectedVersion: selected.value.version, reason: reason.value.trim() });
      action.value = null; reason.value = ''; notice.value = '组织状态已更新'; await load();
    } catch (e) { formError.value = message(e); }
    finally { busy.value = false; confirming.value = false; }
  }

  function updateOnline() { online.value = navigator.onLine; }
  if (getCurrentInstance()) {
    onMounted(() => { window.addEventListener('online', updateOnline); window.addEventListener('offline', updateOnline); void load(); });
    onBeforeUnmount(() => {
      listSequence++; detailSequence++;
      window.removeEventListener('online', updateOnline); window.removeEventListener('offline', updateOnline);
    });
  }
  return { items, total, page, keyword, status, selected, selectedId, loading, detailLoading, ready, busy, error, formError, notice,
    online, mode, action, reason, confirming, form, load, create, open, close, requestDecision, save, decide };
}
