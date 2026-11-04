import type { Organization, OrganizationDecision } from '@refs-tools/contracts/organizations'

const transitions = { approve: ['pending_review', 'active'], reject: ['pending_review', 'rejected'],
  freeze: ['active', 'frozen'], unfreeze: ['frozen', 'active'] } as const

/** 返回平台治理动作的目标状态；非法前置状态返回 null，不隐式重新审核或恢复终态组织。 */
export function organizationStatusAfter(status: Organization['status'], action: OrganizationDecision['action']): Organization['status'] | null {
  const [from, to] = transitions[action]
  return status === from ? to : null
}
