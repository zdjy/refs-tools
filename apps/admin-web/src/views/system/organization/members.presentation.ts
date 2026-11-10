import { h } from 'vue';
import { NTag, type DataTableColumns } from 'naive-ui';
import type { Membership, OrganizationInvitation } from '@refs-tools/contracts/organization-members';
import AdminConfirmButton from '@/components/admin-shell/AdminConfirmButton.vue';
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

const status = (value: string) =>
  h(
    NTag,
    { bordered: false, type: value === 'active' || value === 'accepted' ? 'success' : value === 'pending' ? 'warning' : 'default' },
    { default: () => labels[value] }
  );
const date = (value: string) => new Date(value).toLocaleString('zh-CN', { hour12: false });

/** 行内动作：24px 图标按钮，破坏性动作就地确认（FS-0010 v2 §5.1、§5.2）。 */
function actionCell(kind: MemberAction['kind'], enabled: () => boolean, select: (value: MemberAction) => void, row: { id: string; version: number; name: string }) {
  const hint = actionHints[kind];
  return h(AdminConfirmButton, {
    icon: hint.icon,
    tone: hint.tone,
    label: memberActionLabels[kind],
    message: hint.message,
    confirmLabel: memberActionLabels[kind],
    disabled: !enabled(),
    onConfirm: () => select({ kind, id: row.id, version: row.version, name: row.name }),
  });
}

/** 表格仅适配表现层；操作能力与可写状态由服务端及页面状态提供。 */
export function memberColumns(
  enabled: () => boolean,
  select: (value: MemberAction) => void,
  ownerId: () => string,
  actorId: () => string
): DataTableColumns<Membership> {
  return [
    { title: '成员', key: 'displayName', minWidth: 120 },
    { title: '用户 ID', key: 'userId', minWidth: 260, render: (row) => h('span', { class: 'admin-cell-mono' }, row.userId) },
    { title: '状态', key: 'status', width: 96, render: (row) => status(row.status) },
    { title: '加入 / 申请时间', key: 'createdAt', width: 168, render: (row) => date(row.createdAt) },
    {
      title: '操作',
      key: 'actions',
      width: 92,
      align: 'right',
      render: (row) => {
        const kinds: MemberAction['kind'][] =
          row.status === 'pending'
            ? ['approve', 'reject']
            : row.status === 'active' && row.userId !== ownerId() && row.userId !== actorId()
              ? ['remove']
              : [];
        return h(
          'div',
          { class: 'admin-row-actions admin-row-actions-static' },
          kinds.map((kind) => actionCell(kind, enabled, select, { id: row.id, version: row.version, name: row.displayName }))
        );
      },
    },
  ];
}

/** 邀请历史始终保留，只有待回应记录显示撤销入口。 */
export function invitationColumns(enabled: () => boolean, select: (value: MemberAction) => void): DataTableColumns<OrganizationInvitation> {
  return [
    { title: '受邀人', key: 'displayName', minWidth: 120 },
    { title: '用户 ID', key: 'userId', minWidth: 260, render: (row) => h('span', { class: 'admin-cell-mono' }, row.userId) },
    { title: '状态', key: 'status', width: 96, render: (row) => status(row.status) },
    { title: '过期时间', key: 'expiresAt', width: 168, render: (row) => date(row.expiresAt) },
    {
      title: '操作',
      key: 'actions',
      width: 92,
      align: 'right',
      render: (row) =>
        row.status === 'pending'
          ? h(
              'div',
              { class: 'admin-row-actions admin-row-actions-static' },
              [actionCell('revoke', enabled, select, { id: row.id, version: row.version, name: row.displayName })]
            )
          : h('span', { class: 'admin-cell-meta' }, '—'),
    },
  ];
}
