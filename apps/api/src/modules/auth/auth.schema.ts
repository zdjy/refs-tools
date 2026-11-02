import {
  AuthSessionResponseSchema, EmailChallengeBodySchema, EmailChallengeResponseSchema,
  EmailCodeLoginBodySchema, PasswordLoginBodySchema, RegisterBodySchema, SetPasswordBodySchema,
} from '@refs-tools/contracts/auth'

export const challengeSchema = { body: EmailChallengeBodySchema, response: { 202: EmailChallengeResponseSchema } }
export const registerSchema = { body: RegisterBodySchema, response: { 201: AuthSessionResponseSchema } }
export const codeLoginSchema = { body: EmailCodeLoginBodySchema, response: { 200: AuthSessionResponseSchema } }
export const passwordLoginSchema = { body: PasswordLoginBodySchema, response: { 200: AuthSessionResponseSchema } }
export const setPasswordSchema = { body: SetPasswordBodySchema, response: { 200: AuthSessionResponseSchema } }
export const sessionSchema = { response: { 200: AuthSessionResponseSchema } }
