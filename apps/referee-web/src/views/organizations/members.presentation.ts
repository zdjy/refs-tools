import type { Membership } from '@refs-tools/contracts/organization-members'
import { formatDate, memberDecisions, memberStatusLabels, type MemberDecision } from './organizations.presentation'

/**
 * 成员名单行的展示投影：把成员记录摊平成平铺行需要的一段文字与状态，模板只负责摆放。
 * 状态不靠颜色单独表达：每行都有色点 + 状态文字，色点只用于快速扫视（docs/ui/courtside.md §2）。
 */
const statusDot: Record<Membership['status'], string> = {
  pending: 'bg-gold', active: 'bg-green', rejected: 'bg-muted', left: 'bg-muted', removed: 'bg-muted',
}

/** 时间标签随状态取词：待审核与已驳回记录的是申请时间，其余是加入时间。 */
function datePrefix(status: Membership['status']): string {
  return status === 'pending' || status === 'rejected' ? '申请于' : '加入于'
}

export const memberActionLabels: Record<MemberDecision, string> = { approve: '批准', reject: '驳回', remove: '移除' }
/** 操作按钮的可访问名称要带上成员昵称，屏幕阅读器在单行内也能分清作用于谁。 */
export const memberActionLabelsFor: Record<MemberDecision, (name: string) => string> = {
  approve: name => `批准${name}加入`,
  reject: name => `驳回${name}的申请`,
  remove: name => `移除${name}`,
}

export interface MemberRowView {
  id: string
  name: string
  /** 昵称首字，作为没有头像时的稳定锚点；按码点取首字，避免拆开表情或生僻字。 */
  initial: string
  isOwner: boolean
  statusLabel: string
  statusDot: string
  datePrefix: string
  dateText: string
  decisions: MemberDecision[]
}

/**
 * 负责人行标注身份且不出现移除按钮：`memberDecisions` 已排除负责人本人，
 * 这里只补上身份标注，不重复实现权限判断。
 */
export function memberRowView(member: Membership, ownerUserId: string): MemberRowView {
  return {
    id: member.id,
    name: member.displayName,
    initial: [...member.displayName.trim()][0] ?? '?',
    isOwner: member.userId === ownerUserId,
    statusLabel: memberStatusLabels[member.status],
    statusDot: statusDot[member.status],
    datePrefix: datePrefix(member.status),
    dateText: formatDate(member.createdAt),
    decisions: memberDecisions(member, ownerUserId),
  }
}
