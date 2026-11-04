import { computed, reactive, ref, watch } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { authApi, authErrorMessage, type AuthApi } from '../../api/auth.api'
import { useEmailChallenge } from './useEmailChallenge'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * 更换登录邮箱的三步交互状态：旧邮箱验证码、当前密码（无密码账号省略）、新邮箱验证码。
 * 校验在提交前逐字段给出提示，服务端仍会独立复核三项证明与邮箱唯一性。
 */
export function useEmailChange(auth: ReturnType<typeof useAuthStore>, api: AuthApi = authApi) {
  const oldChallenge = useEmailChallenge(api), newChallenge = useEmailChallenge(api)
  const fields = reactive({ oldCode: '', newEmail: '', newCode: '', password: '' })
  const errors = ref<Record<string, string>>({})
  const success = ref('')
  const busy = computed(() => auth.busy || oldChallenge.sending.value || newChallenge.sending.value)
  const requiresPassword = computed(() => auth.user?.hasPassword === true)

  watch(() => auth.user?.email, () => {
    oldChallenge.reset(); newChallenge.reset()
    fields.oldCode = ''; fields.newEmail = ''; fields.newCode = ''; fields.password = ''
    errors.value = {}; success.value = ''
  })

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

  async function submit(): Promise<boolean> {
    const user = auth.user
    if (!user || busy.value) return false
    success.value = ''
    const email = fields.newEmail.trim().toLowerCase()
    const next: Record<string, string> = {}
    const oldProof = oldChallenge.proof(user.email, 'email_change')
    const newProof = newChallenge.proof(email, 'email_change')
    if (!oldProof) next.oldCode = '请先获取发送到当前邮箱的验证码。'
    else if (!/^\d{6}$/.test(fields.oldCode)) next.oldCode = '请输入 6 位数字验证码。'
    if (!emailPattern.test(email)) next.newEmail = '请输入有效的新邮箱地址。'
    else if (email === user.email) next.newEmail = '新邮箱不能与当前邮箱相同。'
    if (requiresPassword.value && !fields.password) next.password = '请输入当前登录密码。'
    if (!newProof) next.newCode = '请先获取发送到新邮箱的验证码。'
    else if (!/^\d{6}$/.test(fields.newCode)) next.newCode = '请输入 6 位数字验证码。'
    errors.value = next
    if (Object.keys(next).length || !oldProof || !newProof) return false
    const done = await auth.changeEmail({
      oldChallengeId: oldProof.challengeId, oldCode: fields.oldCode,
      newChallengeId: newProof.challengeId, newCode: fields.newCode, newEmail: email,
      ...(requiresPassword.value ? { password: fields.password } : {}),
    })
    if (!done) return false
    oldChallenge.reset(); newChallenge.reset()
    fields.oldCode = ''; fields.newEmail = ''; fields.newCode = ''; fields.password = ''
    success.value = '邮箱已更新，其他设备的登录会话已失效。'
    return true
  }

  return { fields, errors, success, busy, requiresPassword, oldChallenge, newChallenge, sendOld, sendNew, submit, authErrorMessage }
}
