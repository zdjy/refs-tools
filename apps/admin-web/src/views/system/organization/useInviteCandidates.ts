import { getCurrentInstance, onBeforeUnmount, ref } from 'vue';
import type { Candidate } from '@refs-tools/contracts/organization-access';
import { memberCandidatesApi, MemberCandidatesApiError, type MemberCandidatesApi } from '../../../api/system/member-candidates';

/** 与服务端一致的最短关键词；更短的输入不发请求，避免把候选接口当账号浏览器。 */
export const INVITE_KEYWORD_MIN = 2;
const messages: Record<string, string> = {
  OFFLINE: '当前处于离线状态，无法检索用户，恢复网络后再试',
  NETWORK_ERROR: '用户检索失败或超时，请检查网络后重试',
  UNAUTHENTICATED: '登录已失效，请重新登录',
  FORBIDDEN: '当前账号没有该组织的成员管理权限',
  KEYWORD_TOO_SHORT: '请至少输入 2 个字符',
};

/**
 * 受邀用户检索：候选只驻留弹窗内存，请求代次隔离旧响应；
 * 检索词与候选在关闭弹窗、切换组织或邀请成功后清空。
 */
export function useInviteCandidates(organizationId: () => string, api: MemberCandidatesApi = memberCandidatesApi) {
  const candidates = ref<Candidate[]>([]), keyword = ref(''), page = ref(1), total = ref(0);
  const loading = ref(false), error = ref('');
  let sequence = 0, timer: ReturnType<typeof setTimeout> | undefined;

  async function load(nextPage = page.value) {
    clearTimeout(timer);
    const word = keyword.value.trim();
    const current = ++sequence;
    page.value = nextPage;
    if (word.length < INVITE_KEYWORD_MIN) {
      candidates.value = []; total.value = 0; loading.value = false; error.value = '';
      return;
    }
    loading.value = true; error.value = '';
    try {
      const result = await api.list(organizationId(), word, String(nextPage));
      if (current !== sequence) return;
      candidates.value = result.items; total.value = result.total;
    } catch (e) {
      if (current !== sequence) return;
      candidates.value = []; total.value = 0;
      error.value = e instanceof MemberCandidatesApiError
        ? messages[e.code] ?? '用户检索失败，请重试'
        : '用户检索失败，请重试';
    } finally {
      if (current === sequence) loading.value = false;
    }
  }

  function search(value: string) {
    clearTimeout(timer); sequence++;
    keyword.value = value.slice(0, 100); page.value = 1; candidates.value = []; total.value = 0; error.value = '';
    if (keyword.value.trim().length < INVITE_KEYWORD_MIN) { loading.value = false; return; }
    loading.value = true;
    timer = setTimeout(() => { void load(1); }, 300);
  }

  function clear() {
    clearTimeout(timer); sequence++; candidates.value = []; keyword.value = ''; page.value = 1;
    total.value = 0; loading.value = false; error.value = '';
  }

  if (getCurrentInstance()) onBeforeUnmount(clear);
  return { candidates, keyword, page, total, loading, error, load, search, clear };
}
