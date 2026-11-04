import type { AdminUser, AdminUserList, AdminUserQuery, UpdateAdminUser } from '@refs-tools/contracts/admin-users'
import type { AuthorizationRepositories, PermissionEvaluator } from '../authorization/authorization.types.js'
import type { TransactionRunner } from '../../application/transaction.js'

/** 用户表归身份模块所有；管理端使用最小投影，不接触认证摘要。 */
export interface AdminUsersRepository {
  requireActiveActor(id: string): Promise<boolean>
  list(query: AdminUserQuery, now: Date): Promise<AdminUserList>
  find(id: string, now: Date, lock?: boolean): Promise<AdminUser | null>
  create(input: { id: string; email: string; displayName: string; passwordHash: string }, now: Date): Promise<boolean>
  update(id: string, input: UpdateAdminUser): Promise<boolean>
  remove(id: string, version: number, now: Date): Promise<boolean>
  isProtected(id: string, now: Date): Promise<boolean>
}
export type AdminUsersRepositories = AuthorizationRepositories & {
  users: AdminUsersRepository
  sessions: { revokeUserSessions(userId: string, now: Date): Promise<void> }
}
export type AdminUsersDependencies = {
  transaction: TransactionRunner<AdminUsersRepositories>; permissions: PermissionEvaluator; now: () => Date
  passwordMinLength: number; hashPassword: (password: string) => Promise<string>
}
