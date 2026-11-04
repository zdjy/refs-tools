import type { Membership } from '@refs-tools/contracts/organization-members'

/** pending 申请可批准/驳回，active 关系可结束；终态必须建立新的入会关系。 */
export function membershipStatusAfter(status: Membership['status'], action: 'approve' | 'reject' | 'remove' | 'leave'): Membership['status'] | null {
  if (status === 'pending') return action === 'approve' ? 'active' : action === 'reject' ? 'rejected' : null
  if (status === 'active') return action === 'remove' ? 'removed' : action === 'leave' ? 'left' : null
  return null
}
