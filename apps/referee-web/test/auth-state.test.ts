import { describe, expect, it, vi } from 'vitest'
import { createAuthState } from '../src/application/auth-state'
import { AuthApiError } from '../src/api/auth.api'
import type { AuthApi } from '../src/api/auth.api'

const session = { user: { id: 'u-1', email: 'ref@example.com', displayName: '裁判员', emailVerified: true, hasPassword: false, avatarMediaId: null }, expiresAt: '2030-01-01T00:00:00.000Z' }
const api = (overrides: Partial<AuthApi> = {}): AuthApi => ({
  session: vi.fn().mockResolvedValue(session), challenge: vi.fn(), register: vi.fn(),
  loginWithCode: vi.fn(), loginWithPassword: vi.fn(), setPassword: vi.fn(), changeEmail: vi.fn(), logout: vi.fn(), ...overrides,
}) as AuthApi

describe('createAuthState', () => {
  it('restores a session into memory and logs out without persistence', async () => {
    const service = api()
    const state = createAuthState(service, () => Date.parse('2029-01-01T00:00:00.000Z'))
    await state.restore()
    expect(state.user.value?.email).toBe('ref@example.com')
    expect(state.status.value).toBe('authenticated')
    await state.logout()
    expect(state.user.value).toBeNull()
    expect(state.status.value).toBe('anonymous')
    expect(service.logout).toHaveBeenCalledOnce()
  })

  it('keeps anonymous state when the server returns 401 during restore', async () => {
    const service = api({ session: vi.fn().mockRejectedValue(new AuthApiError('UNAUTHENTICATED', 401)) })
    const state = createAuthState(service)
    await state.restore()
    expect(state.status.value).toBe('anonymous')
    expect(state.error.value).toBe('')
  })

  it('expires the in-memory projection at the server expiry', async () => {
    vi.useFakeTimers()
    const expiringSession = { ...session, expiresAt: new Date(Date.now() + 1_000).toISOString() }
    const service = api({ session: vi.fn().mockResolvedValue(expiringSession) })
    const state = createAuthState(service, Date.now)
    await state.restore()
    vi.advanceTimersByTime(1_000)
    expect(state.status.value).toBe('anonymous')
    vi.useRealTimers()
  })
})
