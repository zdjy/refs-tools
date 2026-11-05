import type { CreateOrganization, Organization, OrganizationDetail, OrganizationList, OrganizationQuery, UpdateOrganization } from '@refs-tools/contracts/organizations'
import type { TransactionRunner } from '../../application/transaction.js'
import type { AuthorizationRepositories, PermissionEvaluator } from '../authorization/authorization.types.js'

export interface OrganizationsRepository {
  list(query: OrganizationQuery): Promise<OrganizationList>
  find(id: string, lock?: boolean): Promise<OrganizationDetail | null>
  create(id: string, input: CreateOrganization, now: Date): Promise<void>
  updateProfile(id: string, input: UpdateOrganization): Promise<boolean>
  changeStatus(id: string, expectedVersion: number, status: Organization['status'], actor: string, reason: string, review: boolean, now: Date): Promise<boolean>
  activateOwnerMembership(id: string, organizationId: string, userId: string): Promise<void>
  /**
   * 版本条件更换负责人并刷新实名与联系方快照（取自新负责人账号资料），返回是否命中当前版本。
   * 不改状态与审核信息，成员关系与角色由调用方在同事务内维护。
   */
  changeOwner(id: string, expectedVersion: number, ownerUserId: string, ownerLegalName: string, contact: string): Promise<boolean>
}
export type OrganizationsRepositories = AuthorizationRepositories & {
  organizations: OrganizationsRepository
  identities: { requireActiveActor(id: string): Promise<boolean> }
}
export type OrganizationsDependencies = {
  transaction: TransactionRunner<OrganizationsRepositories>; permissions: PermissionEvaluator; now: () => Date
}
