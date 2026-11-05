import type { PageQuery, Paged } from '@refs-tools/contracts/pagination'
import type { OwnershipTransfer } from '@refs-tools/contracts/organization-ownership'

export type NewOwnershipTransfer = { id: string; organizationId: string; fromUserId: string; toUserId: string }
/** 被批量改状态的请求，仅含写审计所需的标识与新版本。 */
export type TransferChange = { id: string; version: number }

/** 所有权移交请求持久化，由组织模块拥有；状态按 `now` 投影，到期的 pending 读作 expired。 */
export interface OrganizationOwnershipRepository {
  /** 组织内全部请求（含终态），默认页大小 20。 */
  listByOrganization(organizationId: string, query: PageQuery, now: Date): Promise<Paged<OwnershipTransfer>>
  /** 收件箱：只含发给本人且未到期的 pending 请求，默认页大小 20。 */
  incoming(userId: string, query: PageQuery, now: Date): Promise<Paged<OwnershipTransfer>>
  /** 单条读取并锁定请求行；调用方须已锁组织行，加锁顺序与成员写入一致。 */
  find(organizationId: string, id: string, now: Date): Promise<OwnershipTransfer | null>
  /** 每组织最多一个 pending：已有 pending 时返回 false，由部分唯一索引兜底。 */
  create(input: NewOwnershipTransfer, now: Date, expires: Date): Promise<boolean>
  /** 版本条件决定 pending 请求，返回是否命中。 */
  decide(id: string, version: number, status: 'accepted' | 'declined' | 'cancelled', now: Date): Promise<boolean>
  /** 把已到期的 pending 落为 expired，返回受影响请求供审计。 */
  expireStale(organizationId: string, now: Date): Promise<TransferChange[]>
  /** 所有权已被其他路径变更时，把仍 pending 的请求落为 superseded。 */
  supersedePending(organizationId: string, now: Date): Promise<TransferChange[]>
}
