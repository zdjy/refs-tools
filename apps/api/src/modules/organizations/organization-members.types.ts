import type { MemberListQuery, MemberPageQuery, Membership, MembershipList, OrganizationInvitation, InvitationList } from '@refs-tools/contracts/organization-members'
import type { OrganizationsRepositories } from './organizations.types.js'
import type { TransactionRunner } from '../../application/transaction.js'
import type { PermissionEvaluator } from '../authorization/authorization.types.js'

export interface OrganizationMembersRepository {
  members(id: string, query: MemberListQuery): Promise<Omit<MembershipList, 'canManage'>>
  invitations(filter: { organizationId?: string; userId?: string }, query: MemberPageQuery, now: Date): Promise<Omit<InvitationList, 'canManage'>>
  membership(organizationId: string, id: string): Promise<Membership | null>
  current(organizationId: string, userId: string): Promise<Membership | null>
  join(id: string, organizationId: string, userId: string, status: 'pending' | 'active'): Promise<Membership>
  changeMember(id: string, version: number, status: Membership['status']): Promise<boolean>
  invitation(organizationId: string, id: string, now: Date): Promise<OrganizationInvitation | null>
  createInvitation(id: string, organizationId: string, userId: string, actor: string, now: Date, expires: Date): Promise<boolean>
  changeInvitation(id: string, version: number, status: OrganizationInvitation['status']): Promise<boolean>
}
export type MemberRepositories = OrganizationsRepositories & { members: OrganizationMembersRepository }
export type MemberDependencies = { transaction: TransactionRunner<MemberRepositories>; permissions: PermissionEvaluator; now: () => Date }
