import { describe, expect, it, vi } from 'vitest'
import { newEnforcer } from 'casbin'
import { createCasbinPermissionEvaluator } from '../../src/infrastructure/authorization/casbin.js'
import { createDatabasePool } from '../../src/infrastructure/database/pool.js'
import { buildProductionApp } from '../../src/bootstrap.js'

vi.mock('casbin', async (importOriginal) => {
  const original = await importOriginal<typeof import('casbin')>()
  return { ...original, newEnforcer: vi.fn(original.newEnforcer) }
})
vi.mock('../../src/infrastructure/database/pool.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/infrastructure/database/pool.js')>()
  return { ...original, createDatabasePool: vi.fn(original.createDatabasePool) }
})

describe('Casbin 初始化失败', () => {
  it('适配器不吞掉模型/策略初始化异常', async () => {
    const failure = new Error('策略初始化失败')
    vi.mocked(newEnforcer).mockRejectedValueOnce(failure)
    await expect(createCasbinPermissionEvaluator()).rejects.toBe(failure)
  })

  it('作用域匹配函数注册失败也阻止 evaluator 就绪', async () => {
    const failure = new Error('匹配函数注册失败')
    vi.mocked(newEnforcer).mockImplementationOnce(async (...args) => {
      const original = await vi.importActual<typeof import('casbin')>('casbin')
      const enforcer = await original.newEnforcer(...args)
      vi.spyOn(enforcer, 'addFunction').mockRejectedValueOnce(failure)
      return enforcer
    })
    await expect(createCasbinPermissionEvaluator()).rejects.toBe(failure)
  })

  it('生产装配在接收请求或建立数据库池前失败，不启用旧引擎', async () => {
    const failure = new Error('策略初始化失败')
    vi.mocked(newEnforcer).mockRejectedValueOnce(failure)
    await expect(buildProductionApp({
      AUTH_CHALLENGE_SECRET: 'test-assembly-secret-at-least-32-bytes',
      AUTH_PUBLIC_ORIGIN: 'https://refs.example.com', SMTP_HOST: 'smtp.example.com', SMTP_FROM: 'no-reply@example.com',
    })).rejects.toBe(failure)
    expect(createDatabasePool).not.toHaveBeenCalled()
  })
})
