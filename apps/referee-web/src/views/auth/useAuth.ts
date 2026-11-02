import { computed, reactive, ref, watch } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useEmailChallenge } from './useEmailChallenge'

export type AuthMode = 'code' | 'password' | 'register'
export type AuthFields = { email: string; code: string; displayName: string; password: string }
export type AuthFieldErrors = Partial<Record<keyof AuthFields, string>>

/** 编排登录与注册表单；切换邮箱或用途时使旧验证码失效。 */
export function useAuth(auth: ReturnType<typeof useAuthStore>, initialMode: 'login' | 'register') {
  const mode = ref<AuthMode>(initialMode === 'register' ? 'register' : 'code')
  const fields = reactive<AuthFields>({ email: '', code: '', displayName: '', password: '' })
  const errors = ref<AuthFieldErrors>({})
  const challenge = useEmailChallenge()
  const purpose = computed(() => mode.value === 'register' ? 'register' : 'login')
  const email = computed(() => fields.email.trim().toLowerCase())
  const busy = computed(() => auth.busy || challenge.sending.value)

  function reset() {
    challenge.reset()
    fields.code = ''
    fields.password = ''
    errors.value = {}
    auth.error = ''
  }
  watch([email, purpose], reset, { flush: 'sync' })
  watch(mode, () => { fields.password = ''; errors.value = {}; auth.error = '' })

  function validateEmail() {
    const message = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value) && email.value.length <= 254
      ? '' : '请输入有效的邮箱地址。'
    errors.value = message ? { email: message } : {}
    return !message
  }

  async function sendCode() {
    if (busy.value || !validateEmail()) return
    await challenge.send(email.value, purpose.value)
  }

  async function submit(): Promise<boolean> {
    if (busy.value || !validateEmail()) return false
    const next: AuthFieldErrors = {}
    if (mode.value === 'register' && !fields.displayName.trim()) next.displayName = '请填写显示名称。'
    if (mode.value === 'password' && !fields.password) next.password = '请输入密码。'
    if (mode.value !== 'password') {
      if (!challenge.proof(email.value, purpose.value)) next.code = '请先获取有效的验证码。'
      else if (!/^\d{6}$/.test(fields.code)) next.code = '请输入邮件中的 6 位数字验证码。'
    }
    errors.value = next
    if (Object.keys(next).length) return false
    const proof = { challengeId: challenge.challenge.value?.challengeId ?? '', code: fields.code }
    const success = mode.value === 'password'
      ? await auth.loginWithPassword({ email: email.value, password: fields.password })
      : mode.value === 'register'
        ? await auth.register({ ...proof, displayName: fields.displayName.trim() })
        : await auth.loginWithCode({ ...proof, email: email.value })
    if (success) { fields.password = ''; fields.code = ''; challenge.reset() }
    return success
  }

  return { mode, fields, errors, challenge, busy, sendCode, submit }
}
