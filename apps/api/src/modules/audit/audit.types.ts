import type { AuditEvent, AuditList, AuditQuery } from '@refs-tools/contracts/audit'
import type { TransactionRunner } from '../../application/transaction.js'
import type { AuthorizationRepository } from '../authorization/authorization.types.js'

export type AuditFilter = Omit<AuditQuery, 'limit'> & { organizationId?: string; limit: number }
export interface AuditRepository {
  append(event: AuditEvent & { organizationId: string | null }): Promise<void>
  list(filter: AuditFilter): Promise<AuditList>
}
export type AuditRepositories = { audit: AuditRepository; authorization: AuthorizationRepository }
export type AuditDependencies = { transaction: TransactionRunner<AuditRepositories>; now: () => Date }
export type NewAuditEvent = Omit<AuditEvent, 'id' | 'createdAt'> & { organizationId: string | null }
