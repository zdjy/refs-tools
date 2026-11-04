import { Type, type Static } from '@sinclair/typebox'

const EmailSchema = Type.String({ format: 'email', maxLength: 254 })
const PasswordSchema = Type.String({ minLength: 1, maxLength: 128 })
export const ChallengePurposeSchema = Type.Union([
  Type.Literal('register'), Type.Literal('login'), Type.Literal('password'), Type.Literal('email_change'),
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
/** 首次设置无需重复验证码；已有密码时由服务端强制要求完整 proof。 */
export const SetPasswordBodySchema = Type.Union([
  Type.Object({ newPassword: PasswordSchema }, { additionalProperties: false }),
  Type.Object({ ...ChallengeProofSchema.properties, newPassword: PasswordSchema }, { additionalProperties: false }),
])
/** 更换邮箱：旧邮箱证明 + 当前密码（无密码账号省略） + 新邮箱证明，缺少任一项都不得切换。 */
export const EmailChangeBodySchema = Type.Object({
  oldChallengeId: Type.String({ format: 'uuid' }),
  oldCode: Type.String({ pattern: '^[0-9]{6}$' }),
  password: Type.Optional(PasswordSchema),
  newEmail: EmailSchema,
  newChallengeId: Type.String({ format: 'uuid' }),
  newCode: Type.String({ pattern: '^[0-9]{6}$' }),
}, { additionalProperties: false })
export const AuthUserSchema = Type.Object({
  id: Type.String({ format: 'uuid' }), email: EmailSchema,
  displayName: Type.String(), emailVerified: Type.Boolean(),
  hasPassword: Type.Boolean(),
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
export type EmailChangeBody = Static<typeof EmailChangeBodySchema>
export type AuthUser = Static<typeof AuthUserSchema>
/** 会话凭据只通过 HttpOnly Cookie 传递；此响应不包含 token。 */
export type AuthSessionResponse = Static<typeof AuthSessionResponseSchema>
export type EmailChallengeResponse = Static<typeof EmailChallengeResponseSchema>
