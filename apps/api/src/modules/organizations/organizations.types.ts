import type { CreateOrganization, Organization, OrganizationDetail, OrganizationList, OrganizationQuery } from '@refs-tools/contracts/organizations'
import type { TransactionRunner } from '../../application/transaction.js'
import type { AuthorizationRepositories, PermissionEvaluator } from '../authorization/authorization.types.js'

export interface OrganizationsRepository {
  list(query: OrganizationQuery): Promise<OrganizationList>
  find(id: string, lock?: boolean): Promise<OrganizationDetail | null>
  create(id: string, input: CreateOrganization, now: Date): Promise<void>
  changeStatus(id: string, expectedVersion: number, status: Organization['status'], actor: string, reason: string, review: boolean, now: Date): Promise<boolean>
  activateOwnerMembership(id: string, organizationId: string, userId: string): Promise<void>
}
export type OrganizationsRepositories = AuthorizationRepositories & {
  organizations: OrganizationsRepository
  identities: { requireActiveActor(id: string): Promise<boolean> }
}
export type OrganizationsDependencies = {
  transaction: TransactionRunner<OrganizationsRepositories>; permissions: PermissionEvaluator; now: () => Date
}
