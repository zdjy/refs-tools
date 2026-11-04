import type { FastifyPluginAsync } from 'fastify'
import { apiResponse } from '@refs-tools/contracts'
import type { EmailChallengeBody, EmailChangeBody, EmailCodeLoginBody, PasswordLoginBody, RegisterBody, SetPasswordBody } from '@refs-tools/contracts/auth'
import type { AuthService } from './auth.service.js'
import { clearSessionCookie, requireSameOrigin, sendSession, sessionToken } from './auth.http.js'
import { challengeSchema, codeLoginSchema, emailChangeSchema, passwordLoginSchema, registerSchema, sessionSchema, setPasswordSchema } from './auth.schema.js'

export type AuthRouteDependencies = { service: AuthService; publicOrigin: string }

/** HTTP 适配仅负责输入、Cookie 与响应；业务用例由入口注入。 */
export function authRoutes({ service, publicOrigin }: AuthRouteDependencies): FastifyPluginAsync {
  return async (app) => {
    app.addHook('onRequest', async (request, reply) => {
      reply.header('cache-control', 'no-store')
      requireSameOrigin(request, publicOrigin)
    })
    app.post<{ Body: EmailChallengeBody }>('/email-challenges', { schema: challengeSchema, bodyLimit: 8192 }, async (request, reply) => {
      const result = await service.issueChallenge(request.body, request.ip)
      return reply.code(202).send(apiResponse(result))
    })
    app.post<{ Body: RegisterBody }>('/register', { schema: registerSchema, bodyLimit: 8192 }, async (request, reply) => {
      return sendSession(reply, await service.register(request.body), 201)
    })
    app.post<{ Body: EmailCodeLoginBody }>('/login/email-code', { schema: codeLoginSchema, bodyLimit: 8192 }, async (request, reply) => {
      return sendSession(reply, await service.loginWithCode(request.body, request.ip))
    })
    app.post<{ Body: PasswordLoginBody }>('/login/password', { schema: passwordLoginSchema, bodyLimit: 8192 }, async (request, reply) => {
      return sendSession(reply, await service.loginWithPassword(request.body, request.ip))
    })
    app.post<{ Body: SetPasswordBody }>('/password', { schema: setPasswordSchema, bodyLimit: 8192 }, async (request, reply) => {
      return sendSession(reply, await service.setPassword(sessionToken(request), request.body))
    })
    app.post<{ Body: EmailChangeBody }>('/email-change', { schema: emailChangeSchema, bodyLimit: 8192 }, async (request, reply) => {
      return sendSession(reply, await service.changeEmail(sessionToken(request), request.body))
    })
    app.get('/session', { schema: sessionSchema }, async (request) => {
      return apiResponse(await service.requireSession(sessionToken(request)))
    })
    app.post('/logout', { bodyLimit: 8192 }, async (request, reply) => {
      await service.logout(sessionToken(request))
      clearSessionCookie(reply)
      return apiResponse({ loggedOut: true })
    })
  }
}
