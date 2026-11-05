import type { Role } from '@refs-tools/contracts/authorization'
import type { JoinCode } from '@refs-tools/contracts/organization-access'
import type { Membership, OrganizationInvitation } from '@refs-tools/contracts/organization-members'
import type { Organization } from '@refs-tools/contracts/organizations'
import { OrganizationsApiError } from '../../api/organizations.api'

/** 状态文案兼带「接下来会发生什么」，让待审核、冻结与驳回不只是一个标签。 */
export const organizationStatusText: Record<Organization['status'], { label: string; hint: string }> = {
  pending_review: { label: '待平台审核', hint: '平台审核通过后才能开展业务；审核前没有任何成员管理或运营权限。' },
  active: { label: '运行中', hint: '' },
  frozen: { label: '已冻结', hint: '组织被平台冻结，历史记录保留只读，暂不能新增成员、邀请或授予角色。' },
  rejected: { label: '已驳回', hint: '平台驳回了这份申请。可参考下方说明修改资料后重新提交。' },
  dissolved: { label: '已解散', hint: '组织已解散，仅保留历史记录。' },
}
export const roleLabels: Partial<Record<Role, string>> = { owner: '负责人', organizer: '组织者', certifier: '认证员' }
export const memberStatusLabels: Record<Membership['status'], string> = {
  pending: '待审核', active: '正式成员', rejected: '已驳回', left: '已退出', removed: '已移除',
}
export const invitationStatusLabels: Record<OrganizationInvitation['status'], string> = {
  pending: '待回应', accepted: '已接受', declined: '已拒绝', revoked: '已撤销', expired: '已过期',
}
export const joinCodeStatusLabels: Record<JoinCode['status'], string> = {
  active: '可使用', exhausted: '已用尽', expired: '已过期', revoked: '已撤销',
}
export const relationLabels = { none: '', invited: '已邀请', pending: '申请中', active: '已是成员' } as const

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' })
}
export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const writeNotice = ' 输入已保留。'
const messages: Record<string, string> = {
  OFFLINE: `当前处于离线状态，操作未提交。恢复网络后可重试。${writeNotice}`,
  NETWORK_ERROR: `连接失败或超时，操作结果未知，请先刷新确认是否已生效，再决定是否重试。${writeNotice}`,
  UNAUTHENTICATED: '登录已失效，请重新登录后再操作。',
  FORBIDDEN: '你没有权限执行此操作。',
  NOT_FOUND: '记录不存在，或你没有权限查看。请刷新后重试。',
  VERSION_CONFLICT: '记录已被更新，请刷新后确认最新状态再操作。',
  REASON_REQUIRED: '请填写操作理由。',
  INVALID_REQUEST: '填写内容不符合要求，请检查后重试。',
  INVALID_ORGANIZATION: '请完整填写组织资料。',
  PROFILE_INCOMPLETE: '账号资料还缺真实姓名或手机号，请先到账号设置补全，再回来提交；已填写的内容仍保留在页面上。',
  APPLICATION_LIMIT: '同时待审核的申请已达上限，请等待平台审核后再提交。',
  ORGANIZATION_INACTIVE: '该组织当前不接受成员变更（可能待审核或已冻结）。',
  JOIN_CODE_INVALID: '成员码无效、已过期或已用尽，请向组织管理者确认。',
  JOIN_CODE_LIMIT: '同时有效的成员码已达上限，请先撤销不再使用的成员码。',
  INVALID_JOIN_CODE_STATE: '该成员码已撤销。',
  INVALID_INVITATION_STATE: '邀请已回应、撤销或过期，请刷新后查看最新状态。',
  INVITATION_PENDING: '该用户已有待回应的邀请，请等待回应或先撤销。',
  ALREADY_MEMBER: '该用户已经是正式成员。',
  INVALID_MEMBER: '目标用户须账号有效且邮箱已验证。',
  INVALID_MEMBER_STATE: '当前成员状态不允许此操作，请刷新后重试。',
  PROTECTED_MEMBER: '不能移除组织负责人，也不能通过管理操作移除自己。',
  TARGET_NOT_MEMBER: '只能给有效的正式成员授予角色。',
  ROLE_ALREADY_BOUND: '该成员已拥有此角色。',
  KEYWORD_TOO_SHORT: '请至少输入 2 个字符。',
  INVALID_AUDIT_EVENT: '理由中不能包含链接、密码或令牌等敏感内容。',
}

/** 面向用户的中文反馈不依赖服务端异常文本。 */
export function organizationsErrorMessage(error: unknown): string {
  const code = error instanceof OrganizationsApiError ? error.code : ''
  return messages[code] ?? '服务暂时不可用，请稍后重试。若是提交操作，请先刷新确认是否已生效。'
}

/** 读取失败没有输入需要保留，文案只说明可重试，不暗示已提交。 */
export function organizationsLoadErrorMessage(error: unknown): string {
  const code = error instanceof OrganizationsApiError ? error.code : ''
  if (code === 'OFFLINE') return '当前处于离线状态，无法读取。恢复网络后请重新读取。'
  if (code === 'NETWORK_ERROR') return '连接较慢或已中断，已自动重试仍未成功，请检查网络后重新读取。'
  if (code === 'UNAUTHENTICATED') return '登录已失效，请重新登录后再查看。'
  if (code === 'NOT_FOUND') return '没有找到这个组织，或你没有权限查看。'
  return '暂时无法读取，请稍后重试。若持续失败，请联系平台管理员。'
}

/** 链接按钮样式：与 Naive 胶囊按钮同形，用于 <a> 导航，也可用于原生 <button>（未启用 Preflight，故显式声明边框）。类名保持完整静态字符串以便 Tailwind 扫描。 */
export const linkButton = {
  primary: 'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-ink px-5 text-sm font-medium text-surface no-underline transition-all duration-200 hover:bg-black active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
  secondary: 'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-solid border-line bg-soft px-5 text-sm font-medium text-ink no-underline transition-all duration-200 hover:bg-line active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
} as const
