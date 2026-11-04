import { computed, reactive, ref, watch } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { authApi, authErrorMessage, type AuthApi } from '../../api/auth.api'
import { useEmailChallenge } from './useEmailChallenge'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+/

export type EmailChangeStepId = 'old' | 'password' | 'new'
export type EmailChangeStep = { id: EmailChangeStepId; title: string; hint: string }

/**
 * 更换登录邮箱的分步表单：先证明当前邮箱归属，再确认当前密码（无密码账号跳过该步），最后验证新邮箱并提交。
 * 三步共用一个 composable 的字段状态，只有最后一步才发出唯一的切换请求。
 */
export function useEmailChange(auth: ReturnType<typeof useAuthStore>, api: AuthApi = authApi) {
  const oldChallenge = useEmailChallenge(api), newChallenge = useEmailChallenge(api)
  const fields = reactive({ oldCode: '', newEmail: '', newCode: '', password: '' })
  const errors = ref<Record<string, string>>({})
  const success = ref('')
  const index = ref(0)
  const busy = computed(() => auth.busy || oldChallenge.sending.value || newChallenge.sending.value)
  const requiresPassword = computed(() => auth.user?.hasPassword === true)

  /** 步骤随账号是否有密码而变：跳过密码步，而不是让指示器虚报一步。 */
  const steps = computed<EmailChangeStep[]>(() => [
    { id: 'old', title: '验证当前邮箱', hint: '向当前邮箱发送验证码' },
    ...(requiresPassword.value ? [{ id: 'password' as const, title: '确认当前密码', hint: '输入当前登录密码' }] : []),
    { id: 'new', title: '绑定新邮箱', hint: '验证新邮箱后完成更换' },
  ])
  const step = computed<EmailChangeStep>(() => steps.value[Math.min(index.value, steps.value.length - 1)]!)
  const isFirst = computed(() => index.value === 0)
  const isLast = computed(() => index.value >= steps.value.length - 1)

  watch(() => auth.user?.email, () => {
    oldChallenge.reset(); newChallenge.reset()
    fields.oldCode = ''; fields.newEmail = ''; fields.newCode = ''; fields.password = ''
    errors.value = {}; success.value = ''
    index.value = 0
  })
  // 会话恢复后步骤数量可能变化，把游标收敛到有效范围。
  watch(() => steps.value.length, (count) => { index.value = Math.min(index.value, count - 1) })

  async function sendOld() {
    if (!auth.user || busy.value) return
    success.value = ''
    await oldChallenge.send(auth.user.email, 'email_change')
  }

  async function sendNew() {
    if (busy.value) return
    success.value = ''
    const email = fields.newEmail.trim().toLowerCase()
    if (!emailPattern.test(email)) {
      errors.value = { ...errors.value, newEmail: '请输入有效的新邮箱地址。' }
      return
    }
    errors.value = { ...errors.value, newEmail: '' }
    await newChallenge.send(email, 'email_change')
  }

  /** 收集某一步的字段错误；「下一步」只拦当前步，最终提交合并全部步骤。 */
  function stepErrors(id: EmailChangeStepId): Record<string, string> {
    const user = auth.user
    const next: Record<string, string> = {}
    if (id === 'old') {
      if (!user || !oldChallenge.proof(user.email, 'email_change')) next.oldCode = '请先获取发送到当前邮箱的验证码。'
      else if (!/^\d{6}$/.test(fields.oldCode)) next.oldCode = '请输入 6 位数字验证码。'
    }
    if (id === 'password' && requiresPassword.value && !fields.password) next.password = '请输入当前登录密码。'
    if (id === 'new') {
      const email = fields.newEmail.trim().toLowerCase()
      if (!emailPattern.test(email)) next.newEmail = '请输入有效的新邮箱地址。'
      else if (email === user?.email) next.newEmail = '新邮箱不能与当前邮箱相同。'
      if (!newChallenge.proof(email, 'email_change')) next.newCode = '请先获取发送到新邮箱的验证码。'
      else if (!/^\d{6}$/.test(fields.newCode)) next.newCode = '请输入 6 位数字验证码。'
    }
    return next
  }

  function validate(id: EmailChangeStepId): boolean {
    errors.value = stepErrors(id)
    return Object.keys(errors.value).length === 0
  }

  /** 最终提交一次报出所有缺失项，避免用户反复回到前面的步骤才发现问题。 */
  function validateAll(): boolean {
    errors.value = { ...stepErrors('old'), ...stepErrors('password'), ...stepErrors('new') }
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

  /** 最终提交重新校验全部证明；服务端仍独立复核，前端校验只用于提前反馈。 */
  async function submit(): Promise<boolean> {
    if (!auth.user || busy.value) return false
    success.value = ''
    if (!validateAll()) return false
    const user = auth.user, email = fields.newEmail.trim().toLowerCase()
    const oldProof = oldChallenge.proof(user.email, 'email_change')!
    const newProof = newChallenge.proof(email, 'email_change')!
    const done = await auth.changeEmail({
      oldChallengeId: oldProof.challengeId, oldCode: fields.oldCode,
      newChallengeId: newProof.challengeId, newCode: fields.newCode, newEmail: email,
      ...(requiresPassword.value ? { password: fields.password } : {}),
    })
    if (!done) return false
    oldChallenge.reset(); newChallenge.reset()
    fields.oldCode = ''; fields.newEmail = ''; fields.newCode = ''; fields.password = ''
    errors.value = {}
    index.value = 0
    success.value = '邮箱已更新，其他设备的登录会话已失效。'
    return true
  }

  return { fields, errors, success, busy, requiresPassword, steps, step, index, isFirst, isLast,
    oldChallenge, newChallenge, sendOld, sendNew, validate, validateAll, next, back, submit, authErrorMessage }
}
