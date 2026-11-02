import { reactive, ref } from 'vue'
import type { PasswordLoginBody } from '@refs-tools/contracts/auth'

/** 管理端密码表单只负责交互校验，不推断角色或授予权限。 */
export function useLogin(login: (body: PasswordLoginBody) => Promise<boolean>) {
  const email = ref('')
  const password = ref('')
  const errors = reactive({ email: '', password: '' })
  const focusTarget = ref('')

  async function submit() {
    errors.email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()) && email.value.trim().length <= 254
      ? '' : '请输入有效的邮箱地址。'
    errors.password = password.value.length > 0 && password.value.length <= 128 ? '' : '请输入密码（最多 128 个字符）。'
    focusTarget.value = errors.email ? 'login-email' : errors.password ? 'login-password' : ''
    if (focusTarget.value) return
    const success = await login({ email: email.value.trim().toLowerCase(), password: password.value })
    if (success) password.value = ''
    else focusTarget.value = 'login-error'
  }
  return { email, password, errors, focusTarget, submit }
}
