import { computed, onScopeDispose, reactive, ref, watch } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useEmailChallenge } from './useEmailChallenge'

/** 密码更新成功后采用服务器轮换的会话；失败保留输入供重试。 */
export function useAccount(auth: ReturnType<typeof useAuthStore>) {
  const fields = reactive({ code: '', password: '', confirmation: '' })
  const errors = ref<Record<string, string>>({})
  const success = ref('')
  const challenge = useEmailChallenge()
  const busy = computed(() => auth.busy || challenge.sending.value)
  const isInitialPassword = computed(() => auth.user?.hasPassword === false && auth.user.emailVerified)
  watch(() => auth.user?.id, () => {
    challenge.reset()
    fields.code = ''; fields.password = ''; fields.confirmation = ''
    errors.value = {}; success.value = ''
  })

  async function sendCode() {
    if (!auth.user || busy.value || isInitialPassword.value) return
    success.value = ''
    await challenge.send(auth.user.email, 'password')
  }

  async function savePassword(): Promise<boolean> {
    if (!auth.user || busy.value) return false
    success.value = ''
    const initial = isInitialPassword.value
    const proof = initial ? null : challenge.proof(auth.user.email, 'password')
    const next: Record<string, string> = {}
    if (!initial) {
      if (!proof) next.code = '请先获取有效的邮箱验证码。'
      else if (!/^\d{6}$/.test(fields.code)) next.code = '请输入 6 位数字验证码。'
    }
    if (!fields.password || fields.password.length > 128) next.password = '请输入不超过 128 个字符的新密码。'
    if (fields.confirmation !== fields.password) next.confirmation = '两次输入的密码不一致。'
    errors.value = next
    if (Object.keys(next).length || (!initial && !proof)) return false
    const saved = await auth.setPassword(initial ? { newPassword: fields.password }
      : { challengeId: proof!.challengeId, code: fields.code, newPassword: fields.password })
    if (saved) {
      challenge.reset()
      fields.code = ''; fields.password = ''; fields.confirmation = ''
      success.value = initial ? '密码设置成功，注册已完成。以后可使用邮箱和密码登录。'
        : '密码已更新，其他旧登录会话已失效，当前登录已安全续期。'
    }
    return saved
  }

  onScopeDispose(() => { fields.password = ''; fields.confirmation = '' })
  return { fields, errors, success, challenge, busy, isInitialPassword, sendCode, savePassword }
}
