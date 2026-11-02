import type { AuditAction, AuditQuery } from '@refs-tools/contracts/audit'

export const scopeLabels: Record<NonNullable<AuditQuery['scopeType']>, string> = {
  platform: '平台', self: '本人', organization: '组织', event: '赛事', match: '比赛',
}
export const resourceLabels: Record<NonNullable<AuditQuery['resourceType']>, string> = {
  role_binding: '角色绑定', audit_log: '审计查询', organization: '组织', certification: '认证',
  exam: '考试', question: '题目', attempt: '考试尝试', media: '媒体', forum_resource: '论坛内容',
  assignment: '选派', attendance: '签到', post_game_record: '赛后主记录',
}
const actionLabels: Record<AuditAction, string> = {
  'role.granted': '授予角色', 'role.revoked': '撤销角色', 'audit.queried': '查询审计',
  'organization.reviewed': '审核组织', 'organization.frozen': '冻结组织', 'organization.ownership_transferred': '转移组织所有权',
  'certification.decided': '审核认证', 'certification.revoked': '撤销认证', 'certification.appealed': '处理认证申诉',
  'exam.published': '发布考试', 'question.versioned': '创建题目版本', 'grading.reviewed': '提交阅卷', 'grading.overridden': '修订成绩',
  'media.read_authorized': '授权读取媒体', 'media.deleted': '删除媒体', 'moderation.decided': '社区治理决定',
  'assignment.changed': '变更选派', 'attendance.corrected': '纠正签到', 'post_game_record.changed': '变更赛后主记录',
}

/** 未知的新增动作保留原始标识，避免独立部署版本差异造成空白。 */
export function actionLabel(action: AuditAction): string { return actionLabels[action] ?? action }

/** 时间按当前设备时区显示；保留 ISO 值供 time 元素提供精确时间。 */
export function formatTime(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(date)
}
