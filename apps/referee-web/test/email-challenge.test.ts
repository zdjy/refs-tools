import { describe, expect, it, vi } from 'vitest'
import { useEmailChallenge } from '../src/views/auth/useEmailChallenge'
import type { AuthApi } from '../src/api/auth.api'

const response = { challengeId: '00000000-0000-4000-8000-000000000001', expiresAt: '2030-01-01T00:01:00.000Z' }
const api = (challenge: AuthApi['challenge']): AuthApi => ({
  challenge, session: vi.fn(), register: vi.fn(), loginWithCode: vi.fn(), loginWithPassword: vi.fn(), setPassword: vi.fn(), logout: vi.fn(),
}) as AuthApi

describe('useEmailChallenge', () => {
  it('binds the proof to email and purpose and rate limits resend', async () => {
    const send = vi.fn().mockResolvedValue(response)
    const state = useEmailChallenge(api(send), () => Date.parse('2029-01-01T00:00:00.000Z'))
    await state.send('REF@example.com', 'login')
    expect(state.proof('ref@example.com', 'login')?.challengeId).toBe(response.challengeId)
    expect(state.proof('other@example.com', 'login')).toBeNull()
    expect(state.proof('ref@example.com', 'register')).toBeNull()
    await state.send('ref@example.com', 'login')
    expect(send).toHaveBeenCalledOnce()
  })

  it('ignores a late response after reset', async () => {
    let resolve: (value: typeof response) => void = () => undefined
    const send = vi.fn().mockReturnValue(new Promise<typeof response>((done) => { resolve = done }))
    const state = useEmailChallenge(api(send), () => Date.parse('2029-01-01T00:00:00.000Z'))
    const pending = state.send('ref@example.com', 'login')
    state.reset()
    resolve(response)
    await pending
    expect(state.challenge.value).toBeNull()
  })
})
