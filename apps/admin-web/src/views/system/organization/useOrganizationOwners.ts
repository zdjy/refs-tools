import { getCurrentInstance, onBeforeUnmount, onMounted, ref } from 'vue';
import type { AdminUser } from '@refs-tools/contracts/admin-users';
import { organizationOwnersApi, OrganizationOwnersApiError } from '../../../api/system/organization-owners';

/** 候选账号仅驻留弹窗内存；搜索代次和卸载清理阻止旧响应覆盖新结果。 */
export function useOrganizationOwners(api = organizationOwnersApi) {
  const users = ref<AdminUser[]>([]), selected = ref<AdminUser | null>(null);
  const keyword = ref(''), page = ref(1), total = ref(0), loading = ref(false), error = ref('');
  let sequence = 0, timer: ReturnType<typeof setTimeout> | undefined;

  async function load(nextPage = page.value) {
    clearTimeout(timer);
    const current = ++sequence;
    loading.value = true; error.value = ''; users.value = []; page.value = nextPage;
    try {
      const result = await api.list({ keyword: keyword.value.trim(), page: String(nextPage), pageSize: '20' });
      if (current !== sequence) return;
      users.value = result.items; total.value = result.total;
    } catch (e) {
      if (current !== sequence) return;
      const messages: Record<string, string> = { NETWORK_ERROR: '用户查询失败，请检查网络后重试',
        UNAUTHENTICATED: '登录已失效，请重新登录', FORBIDDEN: '当前账号没有用户查询权限' };
      error.value = e instanceof OrganizationOwnersApiError ? messages[e.code] ?? '用户查询失败，请重试' : '用户查询失败，请重试';
    } finally { if (current === sequence) loading.value = false; }
  }

  function search(value: string) {
    clearTimeout(timer); sequence++;
    keyword.value = value.slice(0, 100); page.value = 1; total.value = 0; users.value = []; error.value = ''; loading.value = true;
    timer = setTimeout(() => { void load(1); }, 300);
  }
  function select(id: string | null) {
    if (!id) { selected.value = null; return ''; }
    const user = users.value.find(item => item.id === id) ?? (selected.value?.id === id ? selected.value : null);
    if (!user || user.status !== 'active' || !user.emailVerified) return selected.value?.id ?? '';
    selected.value = user;
    return user.id;
  }
  function dispose() { clearTimeout(timer); sequence++; users.value = []; selected.value = null; loading.value = false; }
  if (getCurrentInstance()) { onMounted(() => { void load(1); }); onBeforeUnmount(dispose); }
  return { users, selected, keyword, page, total, loading, error, load, search, select, dispose };
}
