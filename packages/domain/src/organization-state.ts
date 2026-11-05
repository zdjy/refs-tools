import type { Organization, OrganizationDecision } from '@refs-tools/contracts/organizations'

const transitions = { approve: ['pending_review', 'active'], reject: ['pending_review', 'rejected'],
  freeze: ['active', 'frozen'], unfreeze: ['frozen', 'active'] } as const

/** 返回平台治理动作的目标状态；非法前置状态返回 null，不隐式重新审核或恢复终态组织。 */
export function organizationStatusAfter(status: Organization['status'], action: OrganizationDecision['action']): Organization['status'] | null {
  const [from, to] = transitions[action]
  return status === from ? to : null
}

const profileEditable = ['pending_review', 'active', 'frozen'] as const

/** 平台可修正组织资料的状态；已驳回与已解散为终态，需重新申请或走后续治理流程，不能直接改写资料。 */
export function canUpdateOrganizationProfile(status: Organization['status']): boolean {
  return (profileEditable as readonly Organization['status'][]).includes(status)
}
