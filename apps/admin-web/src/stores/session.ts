import { onScopeDispose } from 'vue'
import { defineStore } from 'pinia'
import { authApi } from '../api/auth.api'
import { createSessionState } from '../application/session-state'

export const useSessionStore = defineStore('admin-session', () => {
  const state = createSessionState(authApi)
  onScopeDispose(state.dispose)
  return state
})
