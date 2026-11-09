import type { MemberContact, MemberListQuery, MemberPageQuery, Membership, MembershipList, OrganizationInvitation, InvitationList } from '@refs-tools/contracts/organization-members'
import type { OrganizationsRepositories } from './organizations.types.js'
import type { TransactionRunner } from '../../application/transaction.js'
import type { PermissionEvaluator } from '../authorization/authorization.types.js'

export interface OrganizationMembersRepository {
  /** 普通成员读取时由 Service 强制限定正式成员，不能由客户端解除。 */
  members(id: string, query: MemberListQuery, activeOnly: boolean): Promise<Omit<MembershipList, 'canManage'>>
  invitations(filter: { organizationId?: string; userId?: string }, query: MemberPageQuery, now: Date): Promise<Omit<InvitationList, 'canManage'>>
  membership(organizationId: string, id: string): Promise<Membership | null>
  /** 按组织成员管理用途读取联系方式投影；不存在或不属于该组织时返回 null。 */
  memberContact(organizationId: string, id: string): Promise<MemberContact | null>
  current(organizationId: string, userId: string): Promise<Membership | null>
  join(id: string, organizationId: string, userId: string, status: 'pending' | 'active'): Promise<Membership>
  changeMember(id: string, version: number, status: Membership['status']): Promise<boolean>
  invitation(organizationId: string, id: string, now: Date): Promise<OrganizationInvitation | null>
  createInvitation(id: string, organizationId: string, userId: string, actor: string, now: Date, expires: Date): Promise<boolean>
  changeInvitation(id: string, version: number, status: OrganizationInvitation['status']): Promise<boolean>
}
export type MemberRepositories = OrganizationsRepositories & { members: OrganizationMembersRepository }
export type MemberDependencies = { transaction: TransactionRunner<MemberRepositories>; permissions: PermissionEvaluator; now: () => Date }
