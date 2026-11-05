import type { Paged } from '@refs-tools/contracts/pagination'
import type { PlatformInvite, PlatformInviteQuery } from '@refs-tools/contracts/platform-invites'

export type NewPlatformInvite = { id: string; tokenHash: string; hint: string; createdBy: string }
/** 兑换成功后回传的最小信息：审核人取自发码管理员，version 为消费后的版本。 */
export type ConsumedPlatformInvite = { id: string; createdBy: string; version: number }

/** 平台创建邀请码持久化，由组织模块拥有；只存哈希，查询绝不返回哈希或明文。 */
export interface PlatformInvitesRepository {
  /** 分页读取，默认页大小 20；状态按 `now` 投影，可按状态筛选。 */
  list(query: PlatformInviteQuery, now: Date): Promise<Paged<PlatformInvite>>
  create(input: NewPlatformInvite, now: Date, expires: Date): Promise<void>
  /** 单条读取并加行锁，供撤销前核对版本。 */
  find(id: string, now: Date): Promise<PlatformInvite | null>
  /** 版本条件撤销：仅未使用且未撤销的码命中，返回是否更新。 */
  revoke(id: string, version: number, now: Date): Promise<boolean>
  /**
   * 单条条件 UPDATE 消费一次性码：未使用、未撤销、未到期才写入使用记录。
   * 调用方须已创建 `organizationId` 对应的组织行（外键），并在失败时回滚整个事务。
   */
  consume(tokenHash: string, userId: string, organizationId: string, now: Date): Promise<ConsumedPlatformInvite | null>
}
