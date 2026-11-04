import { getCurrentInstance, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import type { AdminUser } from '@refs-tools/contracts/admin-users';
import { adminUsersApi } from '../../../api/system/admin-users';

/** 用户 CRUD 状态；请求序号防止旧列表或详情覆盖最新筛选及编辑对象。 */
export function useUsers(api = adminUsersApi) {
  const items = ref<AdminUser[]>([]), total = ref(0), page = ref(1);
  const keyword = ref(''), status = ref<AdminUser['status'] | null>(null);
  const loading = ref(false), busy = ref(false), detailLoading = ref(false), detailReady = ref(false);
  const error = ref(''), formError = ref(''), notice = ref('');
  const online = ref(typeof navigator === 'undefined' || navigator.onLine);
  const selected = ref<AdminUser | null>(null);
  const mode = ref<'create' | 'edit' | 'detail' | null>(null);
  const confirm = ref<'disable' | 'delete' | null>(null);
  const form = reactive({ email: '', displayName: '', password: '', status: 'active' as AdminUser['status'] });
  let listSequence = 0, detailSequence = 0;
  const message = (e: unknown) => e instanceof Error ? e.message : '操作失败，请重试';

  async function load(nextPage = page.value) {
    const sequence = ++listSequence;
    page.value = nextPage; loading.value = true; error.value = '';
    try {
      const result = await api.list({ keyword: keyword.value.trim(), ...(status.value ? { status: status.value } : {}),
        page: String(nextPage), pageSize: '20' });
      if (sequence !== listSequence) return;
      items.value = result.items; total.value = result.total;
    } catch (e) { if (sequence === listSequence) error.value = message(e); }
    finally { if (sequence === listSequence) loading.value = false; }
  }

  function create() {
    if (busy.value) return;
    detailSequence++; detailLoading.value = false; detailReady.value = true;
    selected.value = null; formError.value = ''; notice.value = '';
    Object.assign(form, { email: '', displayName: '', password: '', status: 'active' }); mode.value = 'create';
  }

  async function open(user: AdminUser, nextMode: 'edit' | 'detail') {
    if (busy.value) return;
    const sequence = ++detailSequence;
    selected.value = user; mode.value = nextMode; formError.value = ''; notice.value = '';
    detailLoading.value = true; detailReady.value = false;
    try {
      const current = await api.detail(user.id);
      if (sequence !== detailSequence) return;
      selected.value = current; Object.assign(form, { ...current, password: '' }); detailReady.value = true;
    } catch (e) { if (sequence === detailSequence) formError.value = message(e); }
    finally { if (sequence === detailSequence) detailLoading.value = false; }
  }

  function close() {
    if (busy.value) return;
    detailSequence++; mode.value = null; confirm.value = null; form.password = ''; detailLoading.value = false;
  }

  async function save(confirmed = false) {
    if (busy.value || detailLoading.value || !detailReady.value || !online.value ||
      (mode.value !== 'create' && (mode.value !== 'edit' || !selected.value))) return;
    if (mode.value === 'edit' && form.status === 'disabled' && selected.value?.status === 'active' && !confirmed) {
      confirm.value = 'disable'; return;
    }
    const creating = mode.value === 'create';
    busy.value = true; formError.value = ''; notice.value = '';
    try {
      if (creating) await api.create({ email: form.email.trim().toLowerCase(), displayName: form.displayName.trim(), password: form.password });
      else if (selected.value) await api.update(selected.value.id, {
        displayName: form.displayName.trim(), status: form.status, version: selected.value.version,
      });
      form.password = ''; mode.value = null; confirm.value = null; notice.value = creating ? '用户已创建' : '用户修改已保存';
      await load(creating ? 1 : page.value);
    } catch (e) { formError.value = message(e); confirm.value = null; }
    finally { busy.value = false; }
  }

  async function remove() {
    if (busy.value || !selected.value || !detailReady.value || !online.value) return;
    busy.value = true; formError.value = ''; notice.value = '';
    try {
      await api.remove(selected.value.id, selected.value.version);
      mode.value = null; confirm.value = null; notice.value = '用户已删除，历史记录保留';
      await load(items.value.length === 1 && page.value > 1 ? page.value - 1 : page.value);
    } catch (e) { formError.value = message(e); confirm.value = null; }
    finally { busy.value = false; }
  }

  function updateOnline() { online.value = navigator.onLine; }
  if (getCurrentInstance()) {
    onMounted(() => {
      window.addEventListener('online', updateOnline); window.addEventListener('offline', updateOnline); void load();
    });
    onBeforeUnmount(() => {
      listSequence++; detailSequence++;
      window.removeEventListener('online', updateOnline); window.removeEventListener('offline', updateOnline);
    });
  }
  return { items, total, page, keyword, status, loading, busy, detailLoading, error, formError, notice, online,
    selected, mode, confirm, form, detailReady, load, create, open, close, save, remove };
}
