import { createHmac, timingSafeEqual } from 'node:crypto'
import { DomainError } from '../../application/errors.js'

/** 受控事件桥协议，不等同于 OSS 原生 callback；对原始 body 验签，避免 JSON 重编码歧义。 */
export function verifyStorageEvent(body: string, timestamp: string | undefined, signature: string | undefined, secret: string, now: Date): void {
  const fail = () => new DomainError('INVALID_STORAGE_EVENT', '存储事件验证失败', 403)
  if (!timestamp || !/^\d{10,13}$/.test(timestamp) || !signature || !/^[a-f0-9]{64}$/.test(signature)) throw fail()
  if (Math.abs(now.getTime() - Number(timestamp)) > 300000) throw fail()
  const expected = createHmac('sha256', secret).update(`${timestamp}\n${body}`).digest()
  if (!timingSafeEqual(expected, Buffer.from(signature, 'hex'))) throw fail()
}
