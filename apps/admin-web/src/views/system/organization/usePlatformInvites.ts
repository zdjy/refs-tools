import { getCurrentInstance, onBeforeUnmount, ref } from 'vue';
import type { PlatformInvite } from '@refs-tools/contracts/platform-invites';
import { platformInvitesApi, PlatformInvitesApiError } from '../../../api/system/platform-invites';

function errorText(e: unknown) {
  const messages: Record<string, string> = {
    OFFLINE: '当前处于离线状态，操作未提交，恢复网络后再试', NETWORK_ERROR: '网络连接失败或超时，请先刷新确认操作是否已生效后再重试',
    UNAUTHENTICATED: '登录已失效，请重新登录', FORBIDDEN: '当前账号没有平台邀请码管理权限', NOT_FOUND: '邀请码不存在，请刷新列表',
    VERSION_CONFLICT: '邀请码已更新，请重新读取后操作', INVALID_PLATFORM_INVITE_STATE: '该邀请码已使用、过期或撤销，请重新读取',
    INVALID_REQUEST: '有效期须为 1–7 天的整数',
  };
  return e instanceof PlatformInvitesApiError ? messages[e.code] ?? '操作失败，请稍后重试' : '操作失败，请稍后重试';
}

/**
 * 平台邀请码面板状态。新建码的明文只驻留内存：关闭展示块、关闭面板或卸载即清除，
 * 不写入存储、URL 或日志，丢失后只能撤销并重新生成。请求代次隔离翻页与关闭后的旧响应。
 */
export function usePlatformInvites(api = platformInvitesApi) {
  const items = ref<PlatformInvite[]>([]), total = ref(0), page = ref(1), open = ref(false);
  const loading = ref(false), busy = ref(false), ready = ref(false), error = ref(''), notice = ref(''), staleNote = ref('');
  const validDays = ref<number | null>(3), token = ref(''), revoking = ref<PlatformInvite | null>(null), copyNotice = ref('');
  const online = ref(typeof navigator === 'undefined' || navigator.onLine);
  let sequence = 0;

  async function load(nextPage = page.value) {
    const current = ++sequence;
    page.value = nextPage; loading.value = true; error.value = '';
    try {
      const result = await api.list({ page: String(nextPage), pageSize: '20' });
      if (current !== sequence) return;
      items.value = result.items; total.value = result.total; ready.value = true; staleNote.value = '';
    } catch (e) { if (current === sequence) error.value = errorText(e); }
    finally { if (current === sequence) loading.value = false; }
  }
  async function show() {
    if (busy.value) return;
    clear(); open.value = true; await load(1);
  }
  function clear() {
    sequence++; items.value = []; total.value = 0; page.value = 1; ready.value = false; loading.value = false;
    error.value = ''; notice.value = ''; staleNote.value = ''; validDays.value = 3; token.value = ''; revoking.value = null; copyNotice.value = '';
  }
  function close() { if (busy.value) return; open.value = false; clear(); }
  function dismissToken() { token.value = ''; copyNotice.value = ''; }
  /** 复制被浏览器拒绝（权限或非安全上下文）时说明手动复制的替代路径，不假装已复制。 */
  async function copyToken() {
    if (!token.value) return;
    try { await navigator.clipboard.writeText(token.value); copyNotice.value = '已复制到剪贴板。'; }
    catch { copyNotice.value = '浏览器未允许自动复制，请选中上方邀请码手动复制。'; }
  }
  const writable = () => open.value && ready.value && online.value && !busy.value;
  /** 写入已成功后刷新列表失败不改报「操作失败」，只提示列表陈旧并保留重试读取。 */
  async function refreshAfterWrite() {
    await load(1);
    if (error.value) { staleNote.value = `列表刷新失败：${error.value}`; error.value = ''; }
  }
  async function create() {
    if (!writable()) return;
    if (!Number.isInteger(validDays.value) || validDays.value! < 1 || validDays.value! > 7) { error.value = '有效期须为 1–7 天的整数'; return; }
    busy.value = true; error.value = ''; notice.value = ''; token.value = '';
    try {
      const created = await api.create({ validDays: validDays.value! });
      token.value = created.token; notice.value = '邀请码已生成，明文仅显示一次';
    } catch (e) { error.value = errorText(e); return; }
    finally { busy.value = false; }
    await refreshAfterWrite();
  }
  function requestRevoke(invite: PlatformInvite) { if (writable() && invite.status === 'active') { revoking.value = invite; error.value = ''; } }
  function cancelRevoke() { if (!busy.value) revoking.value = null; }
  async function revoke() {
    const target = revoking.value;
    if (!writable() || !target) return;
    busy.value = true; error.value = ''; notice.value = '';
    try {
      await api.revoke(target.id, { expectedVersion: target.version });
      notice.value = '邀请码已撤销';
    } catch (e) { error.value = errorText(e); return; }
    finally { busy.value = false; revoking.value = null; }
    await refreshAfterWrite();
  }
  function updateOnline() { online.value = navigator.onLine; }
  if (getCurrentInstance()) {
    window.addEventListener('online', updateOnline); window.addEventListener('offline', updateOnline);
    onBeforeUnmount(() => {
      sequence++; token.value = '';
      window.removeEventListener('online', updateOnline); window.removeEventListener('offline', updateOnline);
    });
  }
  return { items, total, page, open, loading, busy, ready, error, notice, staleNote, validDays, token, revoking, online, copyNotice,
    load, show, close, dismissToken, copyToken, create, requestRevoke, cancelRevoke, revoke };
}
