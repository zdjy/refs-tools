import { computed, ref } from 'vue'
import type { AuthSessionResponse, PasswordLoginBody } from '@refs-tools/contracts/auth'
import type { AuthApi } from '../api/auth.api'
import { ApiError, errorMessage } from '../api/http'

/** 拥有跨路由的内存会话；凭据只由 HttpOnly Cookie 管理。 */
export function createSessionState(api: AuthApi, now: () => number = Date.now) {
  const session = ref<AuthSessionResponse['data'] | null>(null)
  const status = ref<'unknown' | 'loading' | 'authenticated' | 'anonymous' | 'error'>('unknown')
  const busy = ref(false)
  const error = ref('')
  const user = computed(() => session.value?.user ?? null)
  let revision = 0
  let expiry: ReturnType<typeof setTimeout> | undefined

  function accept(value: AuthSessionResponse['data'] | null) {
    clearTimeout(expiry)
    if (value && Date.parse(value.expiresAt) <= now()) value = null
    session.value = value
    status.value = value ? 'authenticated' : 'anonymous'
    if (value) expiry = setTimeout(() => accept(session.value), Math.min(Date.parse(value.expiresAt) - now(), 2_147_483_647))
  }

  function invalidate() {
    ++revision
    accept(null)
    error.value = ''
  }

  async function restore() {
    if (busy.value || status.value === 'loading') return
    const current = ++revision
    status.value = 'loading'
    error.value = ''
    try {
      const value = await api.session()
      if (current === revision) accept(value)
    } catch (cause) {
      if (current !== revision) return
      if (cause instanceof ApiError && cause.status === 401) accept(null)
      else { accept(null); status.value = 'error'; error.value = errorMessage(cause) }
    }
  }

  async function login(body: PasswordLoginBody): Promise<boolean> {
    if (busy.value) return false
    busy.value = true
    error.value = ''
    const current = ++revision
    try {
      const value = await api.login(body)
      if (current !== revision) return false
      accept(value)
      return status.value === 'authenticated'
    } catch (cause) {
      if (current === revision) error.value = errorMessage(cause)
      return false
    } finally { busy.value = false }
  }

  async function logout(): Promise<void> {
    if (busy.value) return
    busy.value = true
    error.value = ''
    const current = ++revision
    try { await api.logout(); if (current === revision) invalidate() }
    catch (cause) {
      if (current !== revision) return
      if (cause instanceof ApiError && cause.status === 401) invalidate()
      else error.value = '退出未完成，请检查网络后重试；当前登录可能仍然有效。'
    } finally { busy.value = false }
  }

  function dispose() { ++revision; clearTimeout(expiry); session.value = null }
  return { session, status, user, busy, error, restore, login, logout, invalidate, dispose }
}
