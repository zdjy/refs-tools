import type {
  Certification, CertificationAppeal, CertificationDecision, CertificationScope, CertificationStatus, CertificationSummary,
  QualificationLevel,
} from '@refs-tools/contracts/certifications'
import { CertificationsApiError } from '../../api/certifications.api'

export const qualificationLevelLabels: Record<QualificationLevel, string> = {
  national: '国家级', level_1: '一级', level_2: '二级', level_3: '三级',
}

export const certificationStatusText: Record<CertificationStatus, { label: string; hint: string }> = {
  draft: { label: '草稿', hint: '材料尚未提交，可以继续编辑；提交后才进入审核队列。' },
  under_review: { label: '审核中', hint: '已提交审核。审核期间不能编辑材料，结果会显示在本页。' },
  approved: { label: '已批准', hint: '认证当前有效。组织或成员关系失效时，组织认证的效力会自动暂停。' },
  rejected: { label: '已驳回', hint: '本次申请未通过。可阅读审核说明后提交申诉，不能为同一范围另建记录。' },
  suspended: { label: '已暂停', hint: '认证暂时失效。人工暂停需审核员恢复；组织或成员关系恢复后，自动暂停的部分会自动恢复。' },
  revoked: { label: '已撤销', hint: '认证已被撤销，历史与材料继续保留。可提交申诉，不会另建同范围记录。' },
  needs_more_information: { label: '需补件', hint: '审核员要求补充材料。请更新材料后重新提交，原有决定与版本都会保留。' },
}

/** 状态色点与底色只表达分类，文字始终提供同样的信息，不单靠颜色。 */
export const certificationStatusTone: Record<CertificationStatus, { pill: string; dot: string }> = {
  draft: { pill: 'bg-soft text-body', dot: 'bg-muted' },
  under_review: { pill: 'bg-sand text-ink', dot: 'bg-gold' },
  approved: { pill: 'bg-soft text-ink', dot: 'bg-green' },
  rejected: { pill: 'bg-soft text-ink', dot: 'bg-danger' },
  suspended: { pill: 'bg-sand text-ink', dot: 'bg-gold' },
  revoked: { pill: 'bg-soft text-body', dot: 'bg-danger' },
  needs_more_information: { pill: 'bg-sand text-ink', dot: 'bg-gold' },
}

export const decisionLabels: Record<CertificationDecision['decision'], string> = {
  approve: '批准', reject: '驳回', needs_more_information: '要求补件',
  suspend: '暂停', resume: '恢复', revoke: '撤销',
}

export const appealDecisionLabels: Record<NonNullable<CertificationAppeal['decision']>, string> = {
  uphold: '维持原决定', overturn: '改判批准', needs_more_information: '要求补件',
}

export type ReviewDecisionOption = {
  value: CertificationDecision['decision']; label: string; hint: string; danger?: boolean
}
export type AppealDecisionOption = {
  value: NonNullable<CertificationAppeal['decision']>; label: string; hint: string; danger?: boolean
}

/**
 * 组织认证员可选的人工决定，与领域状态机一致（packages/domain/src/certification.ts）。
 * 撤销与暂停用于已批准记录；待审记录不能跳过审核直接暂停。
 */
export function reviewDecisionOptions(status: CertificationStatus): ReviewDecisionOption[] {
  if (status === 'under_review') return [
    { value: 'approve', label: '批准认证', hint: '材料与履历符合要求时批准；申请人必须仍是正式成员。' },
    { value: 'reject', label: '驳回申请', hint: '不符合要求时驳回，并说明需要申诉或重新准备的方向。' },
    { value: 'needs_more_information', label: '要求补件', hint: '材料不足但可补充时使用；申请人补件后重新提交。' },
  ]
  if (status === 'approved') return [
    { value: 'suspend', label: '暂停认证', hint: '人工暂停后需再次审核才能恢复，不随成员关系变化自动恢复。' },
    { value: 'revoke', label: '撤销认证', hint: '撤销是终态，历史保留；申请人可通过申诉请求复核。', danger: true },
  ]
  if (status === 'suspended') return [
    { value: 'resume', label: '恢复认证', hint: '恢复人工暂停的认证；不会改变已撤销记录。' },
    { value: 'revoke', label: '撤销认证', hint: '撤销是终态，历史保留；申请人可通过申诉请求复核。', danger: true },
  ]
  return []
}

/** 申诉复核只能维持、改判批准或要求补件，均由非原审核人执行。 */
export function appealDecisionOptions(): AppealDecisionOption[] {
  return [
    { value: 'uphold', label: '维持原决定', hint: '原决定无误时维持；认证状态保持驳回或撤销。' },
    { value: 'overturn', label: '改判批准', hint: '原决定有误时改判批准；申请人仍须是有效正式成员。' },
    { value: 'needs_more_information', label: '要求补件', hint: '事实不清或材料不足时，让申请人补充后重新提交。' },
  ]
}

export function pendingAppeal(appeals: readonly CertificationAppeal[]): CertificationAppeal | null {
  return appeals.find((item) => item.status === 'pending') ?? null
}

export function scopeName(scope: CertificationScope, orgNames: Readonly<Record<string, string>> = {}): string {
  if (scope.type === 'platform') return '平台认证'
  return scope.organizationId ? orgNames[scope.organizationId] ?? '组织认证' : '组织认证'
}

/** 队列只返回账号 ID，界面用尾号区分申请人，不推测姓名或联系方式。 */
export function applicantTag(userId: string): string {
  return `申请人 ${userId.slice(0, 8)}`
}

export function canAppeal(item: Pick<CertificationSummary, 'status'>): boolean {
  return item.status === 'rejected' || item.status === 'revoked'
}

export function canEdit(item: Pick<CertificationSummary, 'status'>): boolean {
  return item.status === 'draft' || item.status === 'needs_more_information'
}

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
  EMAIL_NOT_VERIFIED: '请先验证邮箱，再提交或审核认证。',
  FORBIDDEN: '你没有权限执行此操作。组织认证由本组织认证员审核，申诉由负责人复核。',
  NOT_FOUND: '认证记录不存在，或你已没有查看权限。请刷新后重试。',
  VERSION_CONFLICT: '认证记录已被更新，请重新读取最新状态后再操作。',
  INVALID_REQUEST: '填写内容不符合要求，请检查后重试。',
  INVALID_CERTIFICATION_STATE: '当前认证状态不允许此操作，请刷新后查看最新状态。',
  CERTIFICATION_EXISTS: '该范围已有认证记录。请在原记录上补件或提交申诉，不能另建一条。',
  CERTIFICATION_PREREQUISITE_REQUIRED: '申请平台认证前，需持有当前有效的组织认证，并保持组织成员关系。',
  CERTIFICATION_MEMBERSHIP_REQUIRED: '申请或审核组织认证时，申请人须为该组织的正式成员，且组织处于运行状态。',
  CERTIFICATION_EVIDENCE_INVALID: '材料须为本人已上传并通过核验的认证专用文件（图片或 PDF）。',
  CERTIFICATION_EVIDENCE_SCOPE_CONFLICT: '不同认证范围的材料不能共用，请为本次范围重新上传。',
  CERTIFICATION_SELF_REVIEW: '不能审核本人的认证申请。',
  APPEAL_PENDING: '已有待处理申诉，请等待复核完成后再操作。',
  APPEAL_CLOSED: '申诉已处理，请刷新后查看最新结果。',
  APPEAL_REVIEWER_CONFLICT: '申诉须由非原审核人且非申请人复核。',
  ORGANIZATION_INACTIVE: '该组织当前只读，暂不能提交申诉。',
  MEDIA_NOT_AVAILABLE: '材料尚不可用，请稍后重试或重新上传。',
  MEDIA_UNAVAILABLE: '文件访问暂不可用，请联系平台管理员检查存储配置。',
  INVALID_AUDIT_EVENT: '理由中不能包含链接、密码或令牌等敏感内容。',
  IDEMPOTENCY_CONFLICT: '这次请求与已保存的申请不一致，请刷新后重新填写。',
  REASON_REQUIRED: '请填写操作理由。',
}

export function certificationErrorMessage(error: unknown): string {
  const code = error instanceof CertificationsApiError ? error.code : ''
  return messages[code] ?? '服务暂时不可用，请稍后重试。若是提交操作，请先刷新确认是否已生效。'
}

export function certificationLoadErrorMessage(error: unknown): string {
  const code = error instanceof CertificationsApiError ? error.code : ''
  if (code === 'OFFLINE') return '当前处于离线状态，无法读取认证记录。恢复网络后请重新读取。'
  if (code === 'NETWORK_ERROR') return '连接较慢或已中断，已自动重试仍未成功，请检查网络后重新读取。'
  if (code === 'UNAUTHENTICATED') return '登录已失效，请重新登录后再查看。'
  if (code === 'EMAIL_NOT_VERIFIED') return '请先验证邮箱，再查看或申请认证。'
  if (code === 'FORBIDDEN') return '你没有权限查看该认证的审核队列或材料。'
  if (code === 'APPEAL_REVIEWER_CONFLICT') return '申诉须由非原审核人且非申请人复核。你当前不能查看或处理这条申诉。'
  if (code === 'NOT_FOUND') return '认证记录不存在，或你已没有查看权限。'
  return '暂时无法读取认证记录，请稍后重试。若持续失败，请联系平台管理员。'
}

/** 读取详情时区分「记录失效」与「材料签名失败」，避免把权限变化说成网络问题。 */
export function certificationDetailErrorMessage(error: unknown): string {
  const code = error instanceof CertificationsApiError ? error.code : ''
  if (code === 'MEDIA_UNAVAILABLE' || code === 'MEDIA_NOT_AVAILABLE') return messages[code]!
  return certificationLoadErrorMessage(error)
}

/** 表单内展示的完整摘要，用于确认提交前核对。 */
export function certificationHeadline(record: Certification, orgNames: Readonly<Record<string, string>> = {}): string {
  return `${scopeName(record.scope, orgNames)} · ${qualificationLevelLabels[record.level]}`
}
