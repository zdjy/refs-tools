import type { AuthUser, ChallengePurpose } from '@refs-tools/contracts/auth'
import type { TransactionRunner } from '../../application/transaction.js'

export type AuthAccount = AuthUser & { status: 'active' | 'disabled'; passwordHash: string | null }
export type EmailChallenge = {
  id: string; email: string; purpose: ChallengePurpose; codeHash: string
  expiresAt: Date; attempts: number; consumedAt: Date | null
}
export type StoredSession = { tokenHash: string; userId: string; expiresAt: Date }
export type ChallengeMail = { email: string; code: string; purpose: ChallengePurpose; expiresAt: Date }
export interface EmailProvider { sendChallenge(message: ChallengeMail): Promise<void> }
export interface SmsProvider { sendChallenge(phoneE164: string, code: string): Promise<void> }
export interface AuthRepository {
  takeRateLimit(key: string, now: Date, windowSeconds: number, limit: number): Promise<boolean>
  saveChallenge(challenge: EmailChallenge): Promise<void>
  lockChallenge(id: string): Promise<EmailChallenge | null>
  recordChallengeAttempt(id: string, consumedAt: Date | null): Promise<void>
  invalidateChallenge(id: string, now: Date): Promise<void>
  createAccount(account: AuthAccount): Promise<AuthAccount | null>
  findAccountByEmail(email: string): Promise<AuthAccount | null>
  lockAccount(id: string): Promise<AuthAccount | null>
  setPassword(userId: string, hash: string): Promise<void>
  verifyEmail(userId: string, now: Date): Promise<void>
  saveSession(session: StoredSession): Promise<void>
  findSession(tokenHash: string, now: Date): Promise<{ account: AuthAccount; expiresAt: Date } | null>
  revokeSession(tokenHash: string, now: Date): Promise<void>
  revokeUserSessions(userId: string, now: Date): Promise<void>
}
export type AuthRepositories = { auth: AuthRepository }
export type AuthPolicy = {
  challengeTtlSeconds: number; challengeAttempts: number; sendWindowSeconds: number
  sendEmailLimit: number; sendIpLimit: number; loginWindowSeconds: number
  loginEmailLimit: number; loginIpLimit: number; sessionTtlSeconds: number; passwordMinLength: number
}
export type AuthDependencies = {
  transaction: TransactionRunner<AuthRepositories>; email: EmailProvider; secret: string
  policy: AuthPolicy; now: () => Date
}
export type SessionGrant = { user: AuthUser; token: string; expiresAt: string }
