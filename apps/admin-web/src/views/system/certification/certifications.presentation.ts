import type { CertificationDecision, CertificationStatus } from '@refs-tools/contracts/certifications';
import { CertificationsApiError } from '../../../api/system/certifications';
import type { BadgeTone, BadgeVariant } from '@/components/admin-shell/badge';
export const statusLabels: Record<CertificationStatus, string> = { draft: '草稿', under_review: '审核中', approved: '已批准', rejected: '已驳回', needs_more_information: '需补件', suspended: '已暂停', revoked: '已撤销' };
export const levelLabels = { national: '国家级', level_1: '一级', level_2: '二级', level_3: '三级' };
/**
 * 状态语义：审核中待办黄、已批准绿、已驳回红，需补件/暂停/撤销/草稿用虚线区分阶段。
 * 同一列表内每个状态的颜色与样式组合都不重复，并始终带文字（FS-0010 v2 §6.4）。
 */
export const statusTones: Record<CertificationStatus, { tone: BadgeTone; variant?: BadgeVariant }> = {
  draft: { tone: 'neutral', variant: 'outline' },
  under_review: { tone: 'warning' },
  needs_more_information: { tone: 'warning', variant: 'outline' },
  approved: { tone: 'success' },
  rejected: { tone: 'danger' },
  suspended: { tone: 'danger', variant: 'outline' },
  revoked: { tone: 'neutral', variant: 'outline' },
};
export const decisionLabels = { approve: '批准认证', reject: '驳回申请', needs_more_information: '要求补件', suspend: '暂停认证', resume: '恢复认证', revoke: '撤销认证', uphold: '维持原决定', overturn: '改判批准' };
/** 按既有状态机投影操作，不承担服务端授权。 */
export function decisionOptions(status: CertificationStatus): CertificationDecision['decision'][] {
  if (status === 'under_review') return ['approve', 'needs_more_information', 'reject'];
  if (status === 'approved') return ['suspend', 'revoke'];
  if (status === 'suspended') return ['resume', 'revoke'];
  return [];
}
/** 面向认证用例的稳定错误，不显示原始异常。 */
export function errorMessage(error: unknown, write = false) {
  const code = error instanceof CertificationsApiError ? error.code : '';
  const messages: Record<string, string> = {
    OFFLINE: write ? '当前离线，操作未提交，输入已保留。' : '当前离线，无法读取记录。恢复网络后请重试。',
    NETWORK_ERROR: write ? '连接失败或超时，请先刷新确认是否已生效，输入已保留。' : '连接失败，已自动重试仍未成功，请重新读取。',
    FORBIDDEN: '你没有平台认证审核权限。', UNAUTHENTICATED: '登录已失效，请重新登录。',
    NOT_FOUND: '记录不存在或已无读取权限。', APPEAL_REVIEWER_CONFLICT: '你是原审核人或申请人，必须回避此次申诉复核。',
    CERTIFICATION_SELF_REVIEW: '不能审核本人的申请。', VERSION_CONFLICT: '记录已更新，请重新读取后再操作。',
    APPEAL_PENDING: '存在待处理申诉，请先完成独立复核。', APPEAL_CLOSED: '申诉已处理，请重新读取。',
    INVALID_AUDIT_EVENT: '理由不能包含链接、密码或令牌等敏感内容。', INVALID_CERTIFICATION_STATE: '当前状态不允许此决定，请重新读取。',
    MEDIA_UNAVAILABLE: '文件访问暂不可用，请检查存储配置。',
  };
  return messages[code] ?? (write ? '操作未确认，请先重新读取核对是否生效；输入已保留。' : '暂时无法读取，请重试。');
}
