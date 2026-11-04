import { computed, onScopeDispose, reactive, ref, watch } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useEmailChallenge } from './useEmailChallenge'

export type PasswordStepId = 'code' | 'password'
export type PasswordStep = { id: PasswordStepId; title: string; hint: string }

/** 密码更新成功后采用服务器轮换的会话；失败保留输入供重试。 */
export function usePasswordSettings(auth: ReturnType<typeof useAuthStore>) {
  const fields = reactive({ code: '', password: '', confirmation: '' })
  const errors = ref<Record<string, string>>({})
  const success = ref('')
  const challenge = useEmailChallenge()
  const index = ref(0)
  const busy = computed(() => auth.busy || challenge.sending.value)
  const isInitialPassword = computed(() => auth.user?.hasPassword === false && auth.user.emailVerified)

  /** 首次设置无需验证码，因此只有一个步骤；已有密码时先验证当前邮箱。 */
  const steps = computed<PasswordStep[]>(() => isInitialPassword.value
    ? [{ id: 'password', title: '设置登录密码', hint: '邮箱已验证，无需验证码' }]
    : [
      { id: 'code', title: '验证当前邮箱', hint: '向当前邮箱发送验证码' },
      { id: 'password', title: '设置新密码', hint: '保存后旧会话失效' },
    ])
  const step = computed<PasswordStep>(() => steps.value[Math.min(index.value, steps.value.length - 1)]!)
  const isFirst = computed(() => index.value === 0)
  const isLast = computed(() => index.value >= steps.value.length - 1)

  watch(() => auth.user?.id, () => {
    challenge.reset()
    fields.code = ''; fields.password = ''; fields.confirmation = ''
    errors.value = {}; success.value = ''
    index.value = 0
  })
  // 首次设置成功后账号变为已设置密码，步骤数量随之变化，把游标收敛到有效范围。
  watch(() => steps.value.length, (count) => { index.value = Math.min(index.value, count - 1) })

  async function sendCode() {
    if (!auth.user || busy.value || isInitialPassword.value) return
    success.value = ''
    await challenge.send(auth.user.email, 'password')
  }

  /** 收集某一步的字段错误；「下一步」只拦当前步，最终提交合并全部步骤。 */
  function stepErrors(id: PasswordStepId): Record<string, string> {
    if (!auth.user) return {}
    const next: Record<string, string> = {}
    if (id === 'code' && !isInitialPassword.value) {
      if (!challenge.proof(auth.user.email, 'password')) next.code = '请先获取有效的邮箱验证码。'
      else if (!/^\d{6}$/.test(fields.code)) next.code = '请输入 6 位数字验证码。'
    }
    if (id === 'password') {
      if (!fields.password || fields.password.length > 128) next.password = '请输入不超过 128 个字符的新密码。'
      if (fields.confirmation !== fields.password) next.confirmation = '两次输入的密码不一致。'
    }
    return next
  }

  function validate(id: PasswordStepId): boolean {
    errors.value = stepErrors(id)
    return Object.keys(errors.value).length === 0
  }

  function validateAll(): boolean {
    errors.value = { ...stepErrors('code'), ...stepErrors('password') }
    return Object.keys(errors.value).length === 0
  }

  function next(): boolean {
    if (!validate(step.value.id)) return false
    if (!isLast.value) index.value++
    return true
  }

  function back(): void {
    errors.value = {}
    index.value = Math.max(0, index.value - 1)
  }

  async function submit(): Promise<boolean> {
    if (!auth.user || busy.value) return false
    success.value = ''
    if (!validateAll()) return false
    const initial = isInitialPassword.value
    const saved = initial
      ? await auth.setPassword({ newPassword: fields.password })
      : await auth.setPassword({ challengeId: challenge.proof(auth.user.email, 'password')!.challengeId,
        code: fields.code, newPassword: fields.password })
    if (!saved) return false
    challenge.reset()
    fields.code = ''; fields.password = ''; fields.confirmation = ''
    errors.value = {}
    index.value = 0
    success.value = initial ? '密码设置成功，注册已完成。以后可使用邮箱和密码登录。'
      : '密码已更新，其他旧登录会话已失效，当前登录已安全续期。'
    return true
  }

  onScopeDispose(() => { fields.password = ''; fields.confirmation = '' })
  return { fields, errors, success, challenge, busy, isInitialPassword, steps, step, index, isFirst, isLast,
    sendCode, validate, validateAll, next, back, submit }
}
