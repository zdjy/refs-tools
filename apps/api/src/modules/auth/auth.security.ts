import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { DomainError } from '../../application/errors.js'

/** 单向摘要用于高熵会话和频控 key；验证码改用带部署密钥的 HMAC。 */
export function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

/** 将低熵验证码绑定到具体 challenge，数据库泄露不能离线穷举。 */
export function challengeDigest(secret: string, id: string, code: string): string {
  return createHmac('sha256', secret).update(`${id}:${code}`).digest('hex')
}

/** 恒定时间比较摘要，拒绝非规范长度。 */
export function equalDigest(left: string, right: string): boolean {
  return left.length === right.length && timingSafeEqual(Buffer.from(left), Buffer.from(right))
}

let activeDerivations = 0
async function derive(password: string, salt: string): Promise<Buffer> {
  if (activeDerivations >= 2) throw new DomainError('AUTH_BUSY', '认证繁忙，请稍后重试', 503)
  activeDerivations++
  try {
    return await new Promise<Buffer>((resolve, reject) => {
      scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 },
        (error, key) => error ? reject(error) : resolve(key))
    })
  } finally { activeDerivations-- }
}

/** 使用有界异步 scrypt 与随机盐，不在事件循环中同步派生密码。 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  return `scrypt:${salt}:${(await derive(password, salt)).toString('hex')}`
}

/** 未设置密码的账号也执行一次相同工作量的派生，减少账号枚举差异。 */
export async function verifyPassword(password: string, hash: string | null): Promise<boolean> {
  const [, salt, expected] = hash?.split(':') ?? []
  const key = await derive(password, salt ?? '00000000000000000000000000000000')
  return expected !== undefined && equalDigest(key.toString('hex'), expected)
}
