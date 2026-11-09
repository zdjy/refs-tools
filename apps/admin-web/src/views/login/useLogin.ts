import { computed, getCurrentScope, onScopeDispose, reactive, ref, watch } from 'vue';
import type { AuthUser, EmailChallengeResponse } from '@refs-tools/contracts/auth';
import { authApi, AuthApiError, type AuthApi } from '../../api/auth.api';

type Translate = (key: string, values?: Record<string, number>) => string;

/** 编排管理端两种登录方式，邮箱切换或组件销毁后忽略迟到响应。 */
export function useLogin(applyUser: (user: AuthUser) => unknown, t: Translate, api: AuthApi = authApi, now = Date.now) {
  const mode = ref<'password' | 'code'>('password');
  const fields = reactive({ email: '', password: '', code: '' });
  const errors = reactive({ email: '', password: '', code: '' });
  const loading = ref(false);
  const sending = ref(false);
  const error = ref('');
  const notice = ref('');
  const challenge = ref<EmailChallengeResponse['data'] | null>(null);
  const email = computed(() => fields.email.trim().toLowerCase());
  const busy = computed(() => loading.value || sending.value);
  let binding = '';
  let revision = 0;
  let disposed = false;

  function clearFeedback() {
    error.value = ''; notice.value = '';
    errors.email = ''; errors.password = ''; errors.code = '';
  }
  watch([email, mode], () => {
    ++revision;
    challenge.value = null; binding = '';
    fields.code = ''; fields.password = '';
    clearFeedback();
  }, { flush: 'sync' });

  function validateEmail() {
    errors.email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value) && email.value.length <= 254 ? '' : t('login.emailInvalid');
    return !errors.email;
  }
  function failure(cause: unknown) {
    if (!(cause instanceof AuthApiError)) return t('login.loginFailedRetry');
    if (cause.status === 403) return t('login.accessDenied');
    const keys: Record<string, string> = {
      OFFLINE: 'offline', NETWORK_ERROR: 'networkError', RATE_LIMITED: 'rateLimited',
      INVALID_CHALLENGE: 'invalidCode', INVALID_CREDENTIALS: 'invalidCredentials',
    };
    return t(`login.${keys[cause.code] ?? 'loginFailedRetry'}`);
  }
  async function sendCode() {
    if (busy.value || mode.value !== 'code') return false;
    clearFeedback();
    if (!validateEmail()) return false;
    const current = ++revision;
    sending.value = true;
    // 重发结果未知时不再使用旧 challenge，避免误用已被服务端替换的验证码。
    challenge.value = null; fields.code = '';
    try {
      const result = await api.challenge({ email: email.value, purpose: 'login' });
      if (disposed || current !== revision) return false;
      challenge.value = result; binding = email.value;
      notice.value = t('login.codeSent');
      return true;
    } catch (cause) {
      if (!disposed && current === revision) error.value = failure(cause);
      return false;
    } finally { sending.value = false; }
  }
  async function submit() {
    if (busy.value) return false;
    clearFeedback();
    if (!validateEmail()) return false;
    if (mode.value === 'password' && !fields.password) errors.password = t('login.passwordRequired');
    if (mode.value === 'code') {
      if (!challenge.value || binding !== email.value) errors.code = t('login.codeRequired');
      else if (Date.parse(challenge.value.expiresAt) <= now()) errors.code = t('login.codeExpired');
      else if (!/^\d{6}$/.test(fields.code)) errors.code = t('login.codeInvalid');
    }
    if (errors.password || errors.code) return false;
    const current = ++revision;
    loading.value = true;
    try {
      const session = mode.value === 'password'
        ? await api.loginWithPassword({ email: email.value, password: fields.password })
        : await api.loginWithCode({ email: email.value, code: fields.code, challengeId: challenge.value!.challengeId });
      if (disposed || current !== revision) return false;
      applyUser(session.user);
      fields.password = ''; fields.code = ''; challenge.value = null;
      return true;
    } catch (cause) {
      if (!disposed && current === revision) error.value = failure(cause);
      return false;
    } finally { loading.value = false; }
  }
  if (getCurrentScope()) onScopeDispose(() => { disposed = true; ++revision; });
  return { mode, fields, errors, loading, sending, busy, error, notice, sendCode, submit };
}
