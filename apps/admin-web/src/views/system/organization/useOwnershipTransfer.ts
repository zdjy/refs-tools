import { getCurrentInstance, onBeforeUnmount, ref } from 'vue';
import type { Membership } from '@refs-tools/contracts/organization-members';
import type { OrganizationDetail } from '@refs-tools/contracts/organizations';
import { organizationMembersApi, OrganizationMembersApiError } from '../../../api/system/organization-members';
import { OrganizationsApiError, organizationsApi } from '../../../api/system/organizations';

function errorText(e: unknown) {
  const messages: Record<string, string> = {
    OFFLINE: '当前处于离线状态，操作未提交，恢复网络后再试', NETWORK_ERROR: '网络连接失败或超时，请先刷新确认移交是否已生效后再重试',
    UNAUTHENTICATED: '登录已失效，请重新登录', FORBIDDEN: '当前账号没有平台组织管理权限', NOT_FOUND: '组织不存在，请刷新列表',
    VERSION_CONFLICT: '组织已更新，请重新读取后再操作', INVALID_ORGANIZATION_STATE: '当前组织状态不允许移交，请重新读取',
    SAME_OWNER: '新负责人不能是当前负责人', INVALID_OWNER: '新负责人须为有效且邮箱已验证的用户',
    NOT_ACTIVE_MEMBER: '新负责人须为本组织的正式成员', PROFILE_INCOMPLETE: '新负责人需先在账号设置中填写真实姓名和手机号',
    ROLE_ALREADY_BOUND: '组织已有负责人角色，请核对后再操作', REASON_REQUIRED: '请填写操作理由',
    INVALID_AUDIT_EVENT: '操作理由不能包含凭据、密码或 URL，请修改后重试', INVALID_REQUEST: '输入格式不符合要求，请检查后重试',
  };
  // 成员名单与移交分属两个网关，错误类型不同，都按稳定错误码翻译。
  return (e instanceof OrganizationsApiError || e instanceof OrganizationMembersApiError) ? messages[e.code] ?? '操作失败，请稍后重试' : '操作失败，请稍后重试';
}

/**
 * 平台直接移交所有权的弹窗状态。候选人取自该组织的成员名单并只保留正式成员，
 * 但这只是界面便利：新负责人是否合格以服务端事务内校验为准。失败保留输入，成功后通知列表刷新。
 */
export function useOwnershipTransfer(api = organizationsApi, members = organizationMembersApi, onDone: () => void = () => {}) {
  const organization = ref<OrganizationDetail | null>(null), candidates = ref<Membership[]>([]);
  const keyword = ref(''), page = ref(1), total = ref(0), selectedId = ref(''), reason = ref('');
  const loading = ref(false), busy = ref(false), confirming = ref(false), error = ref(''), notice = ref('');
  const online = ref(typeof navigator === 'undefined' || navigator.onLine);
  let sequence = 0, timer: ReturnType<typeof setTimeout> | undefined;

  async function load(nextPage = page.value) {
    if (!organization.value) return;
    clearTimeout(timer);
    const current = ++sequence, id = organization.value.id;
    page.value = nextPage; loading.value = true; error.value = '';
    try {
      const result = await members.members(id, { page: String(nextPage), pageSize: '20', ...(keyword.value.trim() ? { keyword: keyword.value.trim() } : {}) });
      if (current !== sequence) return;
      candidates.value = result.items.filter(item => item.status === 'active' && item.userId !== organization.value?.ownerUserId);
      total.value = result.total;
    } catch (e) { if (current === sequence) error.value = errorText(e); }
    finally { if (current === sequence) loading.value = false; }
  }
  function clear() {
    sequence++; clearTimeout(timer); organization.value = null; candidates.value = []; keyword.value = ''; page.value = 1; total.value = 0;
    selectedId.value = ''; reason.value = ''; loading.value = false; confirming.value = false; error.value = '';
  }
  async function open(value: OrganizationDetail) {
    if (busy.value) return;
    clear(); notice.value = ''; organization.value = value; await load(1);
  }
  function close() { if (!busy.value) clear(); }
  /** 搜索防抖：清空旧结果并递增代次，避免过期响应覆盖当前关键词。 */
  function search(value: string) {
    clearTimeout(timer); sequence++; keyword.value = value.slice(0, 100); selectedId.value = '';
    candidates.value = []; loading.value = true;
    timer = setTimeout(() => { void load(1); }, 300);
  }
  const writable = () => !!organization.value && !loading.value && online.value && !busy.value;
  function requestConfirm() {
    if (!writable()) return;
    if (!selectedId.value) { error.value = '请选择新负责人'; return; }
    if (!reason.value.trim()) { error.value = '请填写操作理由'; return; }
    error.value = ''; confirming.value = true;
  }
  async function commit() {
    const target = organization.value;
    if (!writable() || !target || !confirming.value) return;
    busy.value = true; error.value = ''; notice.value = '';
    try {
      await api.transferOwner(target.id, { toUserId: selectedId.value, expectedVersion: target.version, reason: reason.value.trim() });
      clear(); notice.value = '所有权已移交，原负责人保留普通成员身份'; onDone();
    } catch (e) { error.value = errorText(e); }
    finally { busy.value = false; confirming.value = false; }
  }
  function updateOnline() { online.value = navigator.onLine; }
  if (getCurrentInstance()) {
    window.addEventListener('online', updateOnline); window.addEventListener('offline', updateOnline);
    onBeforeUnmount(() => {
      sequence++; clearTimeout(timer);
      window.removeEventListener('online', updateOnline); window.removeEventListener('offline', updateOnline);
    });
  }
  return { organization, candidates, keyword, page, total, selectedId, reason, loading, busy, confirming, error, notice, online,
    load, open, close, search, requestConfirm, commit };
}
