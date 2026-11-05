import type { Membership } from '@refs-tools/contracts/organization-members'

/**
 * pending 申请可批准/驳回，或由申请人本人撤回（记为 left，保留历史）；active 关系可结束；
 * 终态必须建立新的入会关系。管理端 remove 不适用于 pending，避免绕过审核语义。
 */
export function membershipStatusAfter(status: Membership['status'], action: 'approve' | 'reject' | 'remove' | 'leave'): Membership['status'] | null {
  if (status === 'pending') return action === 'approve' ? 'active' : action === 'reject' ? 'rejected' : action === 'leave' ? 'left' : null
  if (status === 'active') return action === 'remove' ? 'removed' : action === 'leave' ? 'left' : null
  return null
}
