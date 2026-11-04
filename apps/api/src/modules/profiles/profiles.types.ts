import type { Profile } from '@refs-tools/contracts/profile'
import type { TransactionRunner } from '../../application/transaction.js'
import type { AuditRepository } from '../audit/audit.types.js'

/** 除乐观锁令牌外的可写档案字段；昵称存放在 users，其余在 referee_profiles。 */
export type ProfileWrite = Omit<Profile, 'userId' | 'version'>

export interface ProfilesRepository {
  /** 读取有效账号的档案投影；`lock` 为真时锁定 users 行，串行化同一账号的并发更新。 */
  find(userId: string, lock: boolean): Promise<Profile | null>
  /** 先按 `expectedVersion` 条件更新 users（昵称 + 版本），再原子写入档案字段；版本不符返回 false。 */
  save(userId: string, expectedVersion: number, next: ProfileWrite): Promise<boolean>
  /** 头像只能引用本人已核验的 avatar 用途对象，避免把他人对象或未完成上传挂到档案。 */
  ownedAvatar(userId: string, mediaId: string): Promise<boolean>
}

export type ProfileRepositories = { profiles: ProfilesRepository; audit: AuditRepository }
export type ProfileDependencies = { transaction: TransactionRunner<ProfileRepositories>; now: () => Date }
