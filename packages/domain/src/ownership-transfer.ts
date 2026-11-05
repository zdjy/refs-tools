import type { Organization } from '@refs-tools/contracts/organizations'
import type { OwnershipTransfer } from '@refs-tools/contracts/organization-ownership'

/**
 * 移交请求的有效状态。仅 pending 会因到期而投影为 expired；终态保持不变。
 * 到期时刻即失效，不依赖后台任务回写（FS-0001 §4.3）。
 */
export function ownershipTransferStatus(transfer: { status: OwnershipTransfer['status']; expiresAt: Date }, now: Date): OwnershipTransfer['status'] {
  if (transfer.status !== 'pending') return transfer.status
  return transfer.expiresAt.getTime() <= now.getTime() ? 'expired' : 'pending'
}

/**
 * 所有权移交允许的组织状态。负责人发起仅限 active：冻结限制新业务，移交属于新业务；
 * 平台管理员处理冻结组织的负责人缺失等治理场景，因此额外允许 frozen。
 * 待审核、已驳回与已解散的组织没有负责人成员关系或已终结，一律不可移交。
 */
export function canTransferOwnership(status: Organization['status'], initiator: 'owner' | 'platform'): boolean {
  return status === 'active' || (initiator === 'platform' && status === 'frozen')
}
