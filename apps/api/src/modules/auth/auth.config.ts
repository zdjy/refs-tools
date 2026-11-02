import type { AuthPolicy } from './auth.types.js'

export const defaultAuthPolicy: AuthPolicy = {
  challengeTtlSeconds: 300, challengeAttempts: 5, sendWindowSeconds: 60,
  sendEmailLimit: 1, sendIpLimit: 10, loginWindowSeconds: 900,
  loginEmailLimit: 10, loginIpLimit: 50, sessionTtlSeconds: 604800, passwordMinLength: 12,
}

/** 读取部署策略；非法配置启动即失败，避免频控和期限静默失效。 */
export function authPolicyFromEnvironment(env: NodeJS.ProcessEnv = process.env): AuthPolicy {
  const policy = { ...defaultAuthPolicy }
  for (const key of Object.keys(policy) as (keyof AuthPolicy)[]) {
    const name = `AUTH_${key.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}`
    if (env[name] === undefined) continue
    const value = Number(env[name])
    if (!Number.isSafeInteger(value) || value < 1) throw new Error(`Invalid ${name}`)
    policy[key] = value
  }
  if (policy.passwordMinLength > 128) throw new Error('AUTH_PASSWORD_MIN_LENGTH exceeds maximum')
  return policy
}
