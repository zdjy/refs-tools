import type { FastifyReply, FastifyRequest } from 'fastify'
import { apiResponse } from '@refs-tools/contracts'
import { DomainError } from '../../application/errors.js'
import type { SessionGrant } from './auth.types.js'

const cookieName = '__Host-refs_session'

/** 只读取规范会话 Cookie；重复值拒绝，避免解析器对重复 Cookie 的歧义。 */
export function sessionToken(request: FastifyRequest): string | undefined {
  const values = (request.headers.cookie ?? '').split(';').map((c) => c.trim())
    .filter((c) => c.startsWith(`${cookieName}=`))
  return values.length === 1 ? values[0]!.slice(cookieName.length + 1) : undefined
}

/** Cookie 写操作包含匿名登录，统一执行精确 Origin 校验以防 login CSRF。 */
export function requireSameOrigin(request: FastifyRequest, origin: string): void {
  if (request.method !== 'GET' && request.headers.origin !== origin) {
    throw new DomainError('ORIGIN_REJECTED', '请求来源不受信任', 403)
  }
}

/** 将内部会话授权转为不含 token 的 DTO，并仅用 Cookie 传递凭据。 */
export function sendSession(reply: FastifyReply, grant: SessionGrant, status = 200): FastifyReply {
  reply.header('set-cookie', `${cookieName}=${grant.token}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${new Date(grant.expiresAt).toUTCString()}`)
  return reply.code(status).send(apiResponse({ user: grant.user, expiresAt: grant.expiresAt }))
}

/** 删除浏览器会话 Cookie；服务器撤销由 Service 完成。 */
export function clearSessionCookie(reply: FastifyReply): void {
  reply.header('set-cookie', `${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`)
}
