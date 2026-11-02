import { Type, type Static } from '@sinclair/typebox'

const EmailSchema = Type.String({ format: 'email', maxLength: 254 })
const PasswordSchema = Type.String({ minLength: 1, maxLength: 128 })
export const ChallengePurposeSchema = Type.Union([
  Type.Literal('register'), Type.Literal('login'), Type.Literal('password'),
])
export const EmailChallengeBodySchema = Type.Object({
  email: EmailSchema, purpose: ChallengePurposeSchema,
}, { additionalProperties: false })
export const ChallengeProofSchema = Type.Object({
  challengeId: Type.String({ format: 'uuid' }),
  code: Type.String({ pattern: '^[0-9]{6}$' }),
}, { additionalProperties: false })
export const RegisterBodySchema = Type.Object({
  ...ChallengeProofSchema.properties,
  displayName: Type.String({ minLength: 1, maxLength: 80 }),
  password: Type.Optional(PasswordSchema),
}, { additionalProperties: false })
export const EmailCodeLoginBodySchema = Type.Object({
  ...ChallengeProofSchema.properties, email: EmailSchema,
}, { additionalProperties: false })
export const PasswordLoginBodySchema = Type.Object({
  email: EmailSchema, password: PasswordSchema,
}, { additionalProperties: false })
export const SetPasswordBodySchema = Type.Object({
  ...ChallengeProofSchema.properties, newPassword: PasswordSchema,
}, { additionalProperties: false })
export const AuthUserSchema = Type.Object({
  id: Type.String({ format: 'uuid' }), email: EmailSchema,
  displayName: Type.String(), emailVerified: Type.Boolean(),
}, { additionalProperties: false })
export const AuthSessionResponseSchema = Type.Object({
  data: Type.Object({ user: AuthUserSchema, expiresAt: Type.String({ format: 'date-time' }) }),
})
export const EmailChallengeResponseSchema = Type.Object({
  data: Type.Object({
    challengeId: Type.String({ format: 'uuid' }), expiresAt: Type.String({ format: 'date-time' }),
  }),
})
export type ChallengePurpose = Static<typeof ChallengePurposeSchema>
export type EmailChallengeBody = Static<typeof EmailChallengeBodySchema>
export type ChallengeProof = Static<typeof ChallengeProofSchema>
export type RegisterBody = Static<typeof RegisterBodySchema>
export type EmailCodeLoginBody = Static<typeof EmailCodeLoginBodySchema>
export type PasswordLoginBody = Static<typeof PasswordLoginBodySchema>
export type SetPasswordBody = Static<typeof SetPasswordBodySchema>
export type AuthUser = Static<typeof AuthUserSchema>
/** 会话凭据只通过 HttpOnly Cookie 传递；此响应不包含 token。 */
export type AuthSessionResponse = Static<typeof AuthSessionResponseSchema>
export type EmailChallengeResponse = Static<typeof EmailChallengeResponseSchema>
