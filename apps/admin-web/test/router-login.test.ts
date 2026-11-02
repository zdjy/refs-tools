import { createMemoryHistory } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import { createAdminRouter } from '../src/router'
import { adminModules } from '../src/router/modules'
import { useLogin } from '../src/views/login/useLogin'
import { actionLabel, formatTime, resourceLabels, scopeLabels } from '../src/views/audit/audit.presentation'
import { AuditResourceTypeSchema } from '@refs-tools/contracts/audit'
import { ScopeTypeSchema } from '@refs-tools/contracts/authorization'

describe('静态导航与展示', () => {
  it('全部业务入口可深链接，未知路径明确 404', () => {
    const router = createAdminRouter(createMemoryHistory('/admin/'))
    for (const path of ['/', '/login', '/audit', ...adminModules.map(item => item.path)]) {
      expect(router.resolve(path).matched).toHaveLength(1)
      expect(router.resolve(path).meta.title).toBeTruthy()
    }
    expect(router.resolve('/unknown').meta.title).toBe('页面不存在')
  })

  it('筛选项完整对应共享契约，未知动作和无效时间有可读回退', () => {
    expect(Object.keys(resourceLabels).sort()).toEqual(AuditResourceTypeSchema.anyOf.map(item => item.const).sort())
    expect(Object.keys(scopeLabels).sort()).toEqual(ScopeTypeSchema.anyOf.map(item => item.const).sort())
    expect(actionLabel('exam.published')).toBe('发布考试')
    expect(formatTime('not-a-time')).toBe('not-a-time')
  })
})

describe('登录交互校验', () => {
  it('校验失败不提交；成功规范化邮箱并清空密码', async () => {
    const login = vi.fn().mockResolvedValue(true)
    const state = useLogin(login)
    await state.submit()
    expect(login).not.toHaveBeenCalled()
    expect(state.focusTarget.value).toBe('login-email')
    state.email.value = ' Admin@Example.COM '
    await state.submit()
    expect(state.focusTarget.value).toBe('login-password')
    state.password.value = 'password'
    await state.submit()
    expect(login).toHaveBeenCalledWith({ email: 'admin@example.com', password: 'password' })
    expect(state.password.value).toBe('')
  })

  it('失败保留输入并聚焦非字段错误', async () => {
    const state = useLogin(vi.fn().mockResolvedValue(false))
    state.email.value = 'admin@example.com'; state.password.value = 'retry'
    await state.submit()
    expect(state.password.value).toBe('retry')
    expect(state.focusTarget.value).toBe('login-error')
  })
})
