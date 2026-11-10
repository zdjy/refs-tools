import { h } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import type { Membership, OrganizationInvitation } from '@refs-tools/contracts/organization-members';
import { actionColumnWidth, actionNode, rowActions } from '@/components/admin-shell/row-actions';
import type { AdminRecordCard, RecordAction } from '@/components/admin-shell/record-card';
import { statusBadge } from '@/components/admin-shell/status-badge';
import type { BadgeTone, BadgeVariant } from '@/components/admin-shell/badge';
import type { MemberAction } from './useOrganizationMembers';

export const memberActionLabels = { approve: '批准入会', reject: '驳回申请', remove: '移除成员', revoke: '撤销邀请' };

/** 治理动作的图标与语义：批准用主色勾，驳回与移除用危险色。 */
const actionHints: Record<MemberAction['kind'], { icon: 'check' | 'ban' | 'trash'; tone: 'primary' | 'danger'; message: string }> = {
  approve: { icon: 'check', tone: 'primary', message: '批准后该用户成为正式成员，可参与组织业务；此操作记录在治理历史中。' },
  reject: { icon: 'ban', tone: 'danger', message: '驳回后申请关闭，用户需重新提交入会申请；此操作记录在治理历史中。' },
  remove: { icon: 'trash', tone: 'danger', message: '移除后成员关系结束，该用户在本组织及下属赛事、比赛的角色立即撤销；历史记录保留。' },
  revoke: { icon: 'ban', tone: 'danger', message: '撤销后邀请立即失效，对方无法再凭此邀请加入本组织。' },
};

const labels: Record<string, string> = {
  pending: '待处理',
  active: '正式成员',
  rejected: '已驳回',
  left: '已退出',
  removed: '已移除',
  accepted: '已接受',
  declined: '已拒绝',
  revoked: '已撤销',
  expired: '已过期',
};

/** 关系状态语义：生效绿、待办黄、终态虚线；文字始终保留。 */
const tones: Record<string, { tone: BadgeTone; variant?: BadgeVariant }> = {
  active: { tone: 'success' },
  accepted: { tone: 'success' },
  pending: { tone: 'warning' },
  rejected: { tone: 'danger' },
  declined: { tone: 'danger', variant: 'outline' },
  removed: { tone: 'neutral' },
  left: { tone: 'neutral', variant: 'outline' },
  revoked: { tone: 'neutral', variant: 'outline' },
  expired: { tone: 'neutral', variant: 'outline' },
};

const status = (value: string) => {
  const state = tones[value] ?? { tone: 'neutral' as const };
  return statusBadge(labels[value] ?? value, state.tone, state.variant);
};
const date = (value: string) => new Date(value).toLocaleString('zh-CN', { hour12: false });

/**
 * 行内动作描述：表格（图标 + 悬浮提示）与窄屏卡片（图标 + 文字）共用；
 * 破坏性动作就地确认，批准类用主色确认按钮（FS-0034 §3）。
 */
function actionSpec(
  kind: MemberAction['kind'],
  enabled: () => boolean,
  select: (value: MemberAction) => void,
  row: { id: string; version: number; name: string }
): RecordAction {
  const hint = actionHints[kind];
  return {
    kind: 'confirm',
    icon: hint.icon,
    label: memberActionLabels[kind],
    message: hint.message,
    confirmLabel: memberActionLabels[kind],
    tone: hint.tone,
    disabled: !enabled(),
    onConfirm: () => select({ kind, id: row.id, version: row.version, name: row.name }),
  };
}

/** 按状态机投影可执行动作，不承担服务端授权。 */
function actionKinds(row: { status: string; userId: string }, ownerId: string, actorId: string): MemberAction['kind'][] {
  if (row.status === 'pending') return ['approve', 'reject'];
  if (row.status === 'active' && row.userId !== ownerId && row.userId !== actorId) return ['remove'];
  return [];
}

/** 表格仅适配表现层；操作能力与可写状态由服务端及页面状态提供。 */
export function memberColumns(
  enabled: () => boolean,
  select: (value: MemberAction) => void,
  ownerId: () => string,
  actorId: () => string,
  compact: boolean
): DataTableColumns<Membership> {
  return [
    { title: '成员', key: 'displayName', minWidth: 120 },
    // 720px 弹窗内要放下全部列：用户 ID 收窄并省略，完整值用 tooltip 查看。
    { title: '用户 ID', key: 'userId', minWidth: 220, ellipsis: { tooltip: true }, render: (row) => h('span', { class: 'admin-cell-mono' }, row.userId) },
    { title: '状态', key: 'status', width: 104, render: (row) => status(row.status) },
    { title: '加入 / 申请时间', key: 'createdAt', width: 168, render: (row) => date(row.createdAt) },
    {
      title: '操作',
      key: 'actions',
      width: actionColumnWidth([memberActionLabels.approve, memberActionLabels.reject], compact),
      align: 'right',
      render: (row) =>
        rowActions(
          actionKinds(row, ownerId(), actorId()).map((kind) =>
            actionNode(actionSpec(kind, enabled, select, { id: row.id, version: row.version, name: row.displayName }))
          )
        ),
    },
  ];
}

/** 邀请历史始终保留，只有待回应记录显示撤销入口。 */
export function invitationColumns(
  enabled: () => boolean,
  select: (value: MemberAction) => void,
  compact: boolean
): DataTableColumns<OrganizationInvitation> {
  return [
    { title: '受邀人', key: 'displayName', minWidth: 120 },
    // 720px 弹窗内要放下全部列：用户 ID 收窄并省略，完整值用 tooltip 查看。
    { title: '用户 ID', key: 'userId', minWidth: 220, ellipsis: { tooltip: true }, render: (row) => h('span', { class: 'admin-cell-mono' }, row.userId) },
    { title: '状态', key: 'status', width: 104, render: (row) => status(row.status) },
    { title: '过期时间', key: 'expiresAt', width: 168, render: (row) => date(row.expiresAt) },
    {
      title: '操作',
      key: 'actions',
      width: actionColumnWidth([memberActionLabels.revoke], compact),
      align: 'right',
      render: (row) =>
        row.status === 'pending'
          ? rowActions([
              actionNode(actionSpec('revoke', enabled, select, { id: row.id, version: row.version, name: row.displayName })),
            ])
          : h('span', { class: 'admin-cell-meta' }, '—'),
    },
  ];
}

const badgeOf = (value: string) => ({ label: labels[value] ?? value, ...(tones[value] ?? { tone: 'neutral' as const }) });

/** 窄屏卡片：成员名 + 状态标签 + 申请/加入时间 + 动作；用户 ID 等技术字段留在详情。 */
export function memberCards(
  rows: Membership[],
  enabled: () => boolean,
  select: (value: MemberAction) => void,
  ownerId: () => string,
  actorId: () => string
): AdminRecordCard[] {
  return rows.map((row) => ({
    key: row.id,
    title: row.displayName,
    badges: [badgeOf(row.status)],
    fields: [{ label: row.status === 'pending' ? '申请时间' : '加入时间', value: date(row.createdAt) }],
    actions: actionKinds(row, ownerId(), actorId()).map((kind) =>
      actionSpec(kind, enabled, select, { id: row.id, version: row.version, name: row.displayName })
    ),
  }));
}

/** 窄屏卡片：受邀人 + 状态标签 + 过期时间 + 撤销（仅待回应）。 */
export function invitationCards(
  rows: OrganizationInvitation[],
  enabled: () => boolean,
  select: (value: MemberAction) => void
): AdminRecordCard[] {
  return rows.map((row) => ({
    key: row.id,
    title: row.displayName,
    badges: [badgeOf(row.status)],
    fields: [{ label: '过期时间', value: date(row.expiresAt) }],
    actions:
      row.status === 'pending'
        ? [actionSpec('revoke', enabled, select, { id: row.id, version: row.version, name: row.displayName })]
        : [],
  }));
}
