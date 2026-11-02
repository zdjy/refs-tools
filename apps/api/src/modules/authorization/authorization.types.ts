import type { Role, ScopedRoleBinding, ScopeType } from '@refs-tools/contracts/authorization'
import type { Permission, PermissionContext, ResourceScope } from '@refs-tools/domain'
import type { TransactionRunner } from '../../application/transaction.js'
import type { AuditRepository } from '../audit/audit.types.js'

export type ResourceReference = { type: ScopeType; id: string | null }
export type NewRoleBinding = { subjectUserId: string; role: Role; scope: ResourceReference; expiresAt: string | null }
export interface AuthorizationRepository {
  findBindings(subjectUserId: string): Promise<ScopedRoleBinding[]>
  resolveScope(reference: ResourceReference): Promise<ResourceScope | null>
  isActiveMember(subjectUserId: string, organizationId: string): Promise<boolean>
  insertBinding(binding: ScopedRoleBinding): Promise<boolean>
  findBinding(id: string): Promise<ScopedRoleBinding | null>
  revokeBinding(id: string, now: string): Promise<boolean>
}
export type AuthorizationRepositories = { authorization: AuthorizationRepository; audit: AuditRepository }
export interface PermissionEvaluator {
  isPermitted(permission: Permission, context: PermissionContext): boolean
}
export type AuthorizationDependencies = {
  transaction: TransactionRunner<AuthorizationRepositories>; now: () => Date; permissions: PermissionEvaluator
}
export type AuthorizationCheck = {
  subjectUserId: string; permission: Permission; resource: ResourceReference
}
