import type { DirectoryList, DirectoryQuery, OrganizationApplication } from '@refs-tools/contracts/organization-self'
import type { Candidate, JoinCode, OrganizationRole } from '@refs-tools/contracts/organization-access'
import type { Organization } from '@refs-tools/contracts/organizations'
import type { PageQuery, Paged } from '@refs-tools/contracts/pagination'
import type { TransactionRunner } from '../../application/transaction.js'
import type { PermissionEvaluator } from '../authorization/authorization.types.js'
import type { MemberRepositories } from './organization-members.types.js'
import type { OrganizationOwnershipRepository } from './organization-ownership.types.js'
import type { PlatformInvitesRepository } from './organization-platform-invites.types.js'

/** 「我的组织」的持久化投影；能力与角色由 Service 按实时授权计算，不在 SQL 中判断。 */
export type MineRow = {
  id: string; name: string; region: string; purpose: string; status: Organization['status']
  ownerUserId: string; createdAt: string; version: number; governanceReason: string | null
  membership: { id: string; status: 'pending' | 'active'; version: number } | null
}
/** 落库的申请：组织资料来自请求，负责人实名与联系方式由服务端从申请人账户资料快照而来。 */
export type NewOrganizationApplication = OrganizationApplication & { ownerLegalName: string; contact: string }
/** 申请人账户资料中与申请相关的最小投影；字段为 null 表示尚未填写。 */
export type ApplicantProfile = { legalName: string | null; phone: string | null }
export interface OrganizationSelfRepository {
  /** 本人组织分页；默认页大小 100，与前端名册一次取全的交互保持一致。 */
  mine(userId: string, query: PageQuery): Promise<Paged<MineRow>>
  directory(userId: string, query: DirectoryQuery): Promise<DirectoryList>
  /** 事务级咨询锁，串行化同一申请人的并发申请，使数量上限不被「先查再写」绕过。 */
  lockApplicant(userId: string): Promise<void>
  countPending(userId: string): Promise<number>
  /** 读取有效账号的资料投影；账号不存在或已失效返回 null。 */
  applicantProfile(userId: string): Promise<ApplicantProfile | null>
  apply(id: string, ownerUserId: string, input: NewOrganizationApplication, now: Date): Promise<void>
  /** 负责人自助修改简介：版本条件更新，返回是否命中当前版本。 */
  updatePurpose(organizationId: string, expectedVersion: number, purpose: string): Promise<boolean>
}
export type NewJoinCode = { id: string; organizationId: string; tokenHash: string; hint: string; maxUses: number; createdBy: string }
export interface OrganizationJoinCodesRepository {
  /** 成员码分页；默认页大小 50，不返回哈希或明文。 */
  list(organizationId: string, query: PageQuery, now: Date): Promise<Paged<JoinCode>>
  countActive(organizationId: string, now: Date): Promise<number>
  create(input: NewJoinCode, now: Date, expires: Date): Promise<void>
  find(organizationId: string, id: string, now: Date): Promise<JoinCode | null>
  /** 仅用哈希定位所属组织，不加锁；调用方须随后锁组织再消费。 */
  organizationOf(tokenHash: string): Promise<string | null>
  /** 单条条件 UPDATE：未撤销、未过期、有剩余次数才递增，返回递增后的投影。 */
  consume(tokenHash: string, organizationId: string, now: Date): Promise<JoinCode | null>
  revoke(id: string, version: number, now: Date): Promise<boolean>
}
export interface OrganizationRolesRepository {
  /** 组织角色分页；默认页大小 100，排序固定为 owner → organizer → certifier。 */
  list(organizationId: string, query: PageQuery, now: Date): Promise<Paged<OrganizationRole>>
  /** 单条读取，供授予后取回同一投影，不必依赖当前页。 */
  find(organizationId: string, bindingId: string, now: Date): Promise<OrganizationRole | null>
}
export interface OrganizationCandidatesRepository {
  /** 候选人检索分页：只接受页码，页大小固定为 `CANDIDATE_PAGE_SIZE`。 */
  search(organizationId: string, actorId: string, keyword: string, page: number, now: Date): Promise<Paged<Candidate>>
}
export type AccessRepositories = MemberRepositories & {
  self: OrganizationSelfRepository; joinCodes: OrganizationJoinCodesRepository
  roles: OrganizationRolesRepository; candidates: OrganizationCandidatesRepository
  platformInvites: PlatformInvitesRepository; ownership: OrganizationOwnershipRepository
}
export type AccessDependencies = { transaction: TransactionRunner<AccessRepositories>; permissions: PermissionEvaluator; now: () => Date }
