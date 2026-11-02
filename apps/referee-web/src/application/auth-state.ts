import { computed, getCurrentScope, onScopeDispose, ref } from 'vue'
import type { AuthSessionResponse, EmailCodeLoginBody, PasswordLoginBody, RegisterBody, SetPasswordBody } from '@refs-tools/contracts/auth'
import { AuthApiError, authErrorMessage, type AuthApi } from '../api/auth.api'

/** 只在内存中拥有跨页面会话投影；凭据由浏览器管理，不进入持久存储。 */
export function createAuthState(api: AuthApi, now: () => number = Date.now) {
  const session = ref<AuthSessionResponse['data'] | null>(null)
  const status = ref<'unknown' | 'loading' | 'authenticated' | 'anonymous' | 'error'>('unknown')
  const busy = ref(false)
  const error = ref('')
  let revision = 0
  let expiry: ReturnType<typeof setTimeout> | undefined
  let restoring: Promise<void> | undefined
  const user = computed(() => session.value?.user ?? null)

  function scheduleExpiry() {
    clearTimeout(expiry)
    if (!session.value) return
    const remaining = Date.parse(session.value.expiresAt) - now()
    if (remaining <= 0) { accept(null); return }
    expiry = setTimeout(() => scheduleExpiry(), Math.min(remaining, 2_147_483_647))
  }

  function accept(value: AuthSessionResponse['data'] | null) {
    clearTimeout(expiry)
    session.value = value
    status.value = value ? 'authenticated' : 'anonymous'
    if (value) scheduleExpiry()
  }

  async function restore(force = false) {
    if (restoring) return restoring
    if (!force && status.value !== 'unknown') return
    const current = ++revision
    status.value = 'loading'
    error.value = ''
    restoring = (async () => {
      try {
        const value = await api.session()
        if (current === revision) accept(value)
      } catch (cause) {
        if (current !== revision) return
        if (cause instanceof AuthApiError && cause.status === 401) accept(null)
        else { session.value = null; status.value = 'error'; error.value = authErrorMessage(cause) }
      } finally { restoring = undefined }
    })()
    return restoring
  }

  async function authenticate(work: () => Promise<AuthSessionResponse['data']>): Promise<boolean> {
    if (busy.value) return false
    busy.value = true
    error.value = ''
    ++revision
    try { accept(await work()); return true }
    catch (cause) {
      if (cause instanceof AuthApiError && cause.code === 'UNAUTHENTICATED') accept(null)
      error.value = authErrorMessage(cause)
      return false
    } finally { busy.value = false }
  }

  async function logout(): Promise<boolean> {
    if (busy.value) return false
    busy.value = true
    error.value = ''
    ++revision
    try { await api.logout(); accept(null); return true }
    catch (cause) {
      if (cause instanceof AuthApiError && cause.status === 401) { accept(null); return true }
      error.value = '退出未完成，请检查网络后重试；当前登录可能仍然有效。'
      return false
    } finally { busy.value = false }
  }

  if (getCurrentScope()) onScopeDispose(() => { ++revision; clearTimeout(expiry) })
  return {
    session, status, user, busy, error, restore, logout,
    register: (input: RegisterBody) => authenticate(() => api.register(input)),
    loginWithCode: (input: EmailCodeLoginBody) => authenticate(() => api.loginWithCode(input)),
    loginWithPassword: (input: PasswordLoginBody) => authenticate(() => api.loginWithPassword(input)),
    setPassword: (input: SetPasswordBody) => authenticate(() => api.setPassword(input)),
  }
}
