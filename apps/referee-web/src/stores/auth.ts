import { defineStore } from 'pinia'
import { authApi, type AuthApi } from '../api/auth.api'
import { createAuthState } from '../application/auth-state'

/** 在装配层注入 API，不在 store 中维护网络或缓存策略。 */
export function createAuthStore(api: AuthApi = authApi) {
  return defineStore('auth', () => createAuthState(api))
}
export const useAuthStore = createAuthStore()
