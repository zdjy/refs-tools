import { computed, getCurrentScope, onScopeDispose, ref } from 'vue'
import type { ChallengePurpose, EmailChallengeResponse } from '@refs-tools/contracts/auth'
import { authApi, authErrorMessage, type AuthApi } from '../../api/auth.api'

/** 将 challenge 绑定到邮箱与用途；失效或切换后不接受迟到的发送响应。 */
export function useEmailChallenge(api: AuthApi = authApi, now: () => number = Date.now) {
  const challenge = ref<EmailChallengeResponse['data'] | null>(null)
  const sending = ref(false)
  const error = ref('')
  const notice = ref('')
  const clock = ref(now())
  const resendAt = ref(0)
  let binding = ''
  let revision = 0
  const ticker = setInterval(() => { clock.value = now() }, 1000)
  const remaining = computed(() => Math.max(0, Math.ceil((resendAt.value - clock.value) / 1000)))
  const expired = computed(() => !!challenge.value && Date.parse(challenge.value.expiresAt) <= clock.value)

  function reset() {
    ++revision
    challenge.value = null
    binding = ''
    sending.value = false
    error.value = ''
    notice.value = ''
  }

  async function send(email: string, purpose: ChallengePurpose) {
    if (sending.value || remaining.value > 0) return
    const current = ++revision
    sending.value = true
    error.value = ''
    notice.value = ''
    try {
      const value = await api.challenge({ email, purpose })
      if (current !== revision) return
      challenge.value = value
      binding = `${purpose}:${email.trim().toLowerCase()}`
      clock.value = now()
      resendAt.value = now() + 60_000
      notice.value = '验证码请求已受理，请查看邮箱及垃圾邮件。'
    } catch (cause) { if (current === revision) error.value = authErrorMessage(cause) }
    finally { if (current === revision) sending.value = false }
  }

  function proof(email: string, purpose: ChallengePurpose) {
    clock.value = now()
    return binding === `${purpose}:${email.trim().toLowerCase()}` && !expired.value ? challenge.value : null
  }

  if (getCurrentScope()) onScopeDispose(() => { ++revision; clearInterval(ticker) })
  return { challenge, sending, error, notice, remaining, expired, reset, send, proof }
}
