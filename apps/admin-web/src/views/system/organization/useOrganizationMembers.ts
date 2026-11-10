import { getCurrentInstance, onBeforeUnmount, onMounted, ref } from 'vue';
import type { Membership, OrganizationInvitation } from '@refs-tools/contracts/organization-members';
import type { Organization } from '@refs-tools/contracts/organizations';
import { organizationMembersApi, OrganizationMembersApiError } from '../../../api/system/organization-members';

function errorText(e: unknown) {
  const messages: Record<string, string> = {
    OFFLINE: '当前处于离线状态，操作未提交，恢复网络后再试', NETWORK_ERROR: '网络连接失败或超时，请先刷新确认操作是否已生效后再重试', NOT_FOUND: '记录不存在或当前账号没有组织成员管理权限', FORBIDDEN: '当前账号没有读取权限',
    UNAUTHENTICATED: '登录已失效，请重新登录', INVALID_MEMBER: '目标用户须有效且邮箱已验证', ALREADY_MEMBER: '目标用户已是正式成员',
    INVITATION_PENDING: '已有待回应邀请，请等待回应或先撤销', VERSION_CONFLICT: '记录已更新，请重新读取后操作',
    INVALID_MEMBER_STATE: '成员状态已变化，请重新读取', INVALID_INVITATION_STATE: '邀请已回应、撤销或过期，请重新读取',
    PROTECTED_MEMBER: '不能移除组织所有者或通过管理操作移除自己', ORGANIZATION_INACTIVE: '组织当前不接受成员变更',
    INVALID_REQUEST: '请检查受邀用户、有效期及输入格式', REASON_REQUIRED: '请填写操作理由', INVALID_AUDIT_EVENT: '理由不得包含凭据或 URL',
  };
  return e instanceof OrganizationMembersApiError ? messages[e.code] ?? '操作失败，请稍后重试' : '操作失败，请稍后重试';
}
export type MemberAction = { kind: 'approve' | 'reject' | 'remove' | 'revoke'; id: string; version: number; name: string };

/** 成员弹窗独立持有内存状态，请求代次隔离组织切换与关闭后的响应。 */
export function useOrganizationMembers(api = organizationMembersApi) {
  const organization = ref<Organization | null>(null), members = ref<Membership[]>([]), invitations = ref<OrganizationInvitation[]>([]);
  const memberPage = ref(1), invitePage = ref(1), memberTotal = ref(0), inviteTotal = ref(0);
  const loading = ref(false), busy = ref(false), ready = ref(false), canManage = ref(false), error = ref(''), notice = ref('');
  const userId = ref(''), validDays = ref<number | null>(7), action = ref<MemberAction | null>(null), reason = ref(''), confirming = ref(false);
  const online = ref(typeof navigator === 'undefined' || navigator.onLine);
  let sequence = 0;
  async function load() {
    if (!organization.value || busy.value || !online.value) return;
    const current = ++sequence, id = organization.value.id;
    loading.value = true; ready.value = false; error.value = '';
    try {
      const [m, i] = await Promise.all([api.members(id, { page: String(memberPage.value), pageSize: '20' }), api.invitations(id, { page: String(invitePage.value), pageSize: '20' })]);
      if (current !== sequence) return;
      members.value = m.items; invitations.value = i.items; memberTotal.value = m.total; inviteTotal.value = i.total;
      canManage.value = m.canManage && i.canManage; ready.value = true;
    } catch (e) { if (current === sequence) error.value = errorText(e); }
    finally { if (current === sequence) loading.value = false; }
  }
  async function open(value: Organization) {
    if (busy.value) return;
    clear(); organization.value = value; await load();
  }
  function clear() {
    sequence++; organization.value = null; members.value = []; invitations.value = []; memberPage.value = 1; invitePage.value = 1;
    memberTotal.value = 0; inviteTotal.value = 0; ready.value = false; canManage.value = false; loading.value = false;
    userId.value = ''; validDays.value = 7; action.value = null; reason.value = ''; confirming.value = false; error.value = ''; notice.value = '';
  }
  function close() { if (!busy.value) clear(); }
  const writable = () => !!organization.value && ready.value && canManage.value && online.value && !busy.value;
  async function invite() {
    if (!writable()) return;
    if (!userId.value.trim() || !Number.isInteger(validDays.value) || validDays.value! < 1 || validDays.value! > 30) {
      error.value = '请从检索结果中选择受邀用户，并填写 1–30 天有效期'; return;
    }
    busy.value = true; error.value = ''; notice.value = '';
    try {
      await api.invite(organization.value!.id, { userId: userId.value.trim(), validDays: validDays.value! });
      userId.value = ''; notice.value = '邀请已创建，等待对方确认'; invitePage.value = 1;
    } catch (e) { error.value = errorText(e); return; }
    finally { busy.value = false; }
    await load();
  }
  function select(value: MemberAction) { if (writable()) { action.value = value; reason.value = ''; error.value = ''; confirming.value = false; } }
  function requestConfirm() {
    if (!writable() || !action.value) return;
    if (!reason.value.trim()) { error.value = '请填写操作理由'; return; }
    confirming.value = true;
  }
  async function commit() {
    if (!writable() || !action.value || !confirming.value) return;
    const selected = action.value;
    busy.value = true; error.value = ''; notice.value = '';
    try {
      const input = { expectedVersion: selected.version, reason: reason.value.trim() };
      if (selected.kind === 'revoke') await api.revoke(organization.value!.id, selected.id, input);
      else await api.decide(organization.value!.id, selected.id, { ...input, action: selected.kind });
      const labels = { approve: '入会申请已通过', reject: '入会申请已驳回', remove: '成员已移除，历史记录保留', revoke: '邀请已撤销' };
      action.value = null; reason.value = ''; notice.value = labels[selected.kind];
    } catch (e) {
      error.value = errorText(e);
      if (e instanceof OrganizationMembersApiError && e.status === 409) ready.value = false;
      return;
    } finally { busy.value = false; confirming.value = false; }
    await load();
  }
  function updateOnline() { online.value = navigator.onLine; }
  if (getCurrentInstance()) {
    onMounted(() => { window.addEventListener('online', updateOnline); window.addEventListener('offline', updateOnline); });
    onBeforeUnmount(() => { clear(); window.removeEventListener('online', updateOnline); window.removeEventListener('offline', updateOnline); });
  }
  return { organization, members, invitations, memberPage, invitePage, memberTotal, inviteTotal, loading, busy, ready, canManage,
    error, notice, userId, validDays, action, reason, confirming, online, load, open, close, invite, select, requestConfirm, commit };
}
