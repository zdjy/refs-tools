import { h } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import type { AdminUser } from '@refs-tools/contracts/admin-users';
import { actionColumnWidth, rowAction, rowConfirm, rowActions } from '@/components/admin-shell/row-actions';
import { statusBadge } from '@/components/admin-shell/status-badge';
import type { BadgeTone, BadgeVariant } from '@/components/admin-shell/badge';

export const roleLabels: Record<string, string> = {
  platform_admin: '平台管理员',
  content_editor: '内容编辑',
  grader: '阅卷员',
  moderator: '版主',
};

export const statusOptions = [
  { label: '正常', value: 'active' },
  { label: '已停用', value: 'disabled' },
];

/** 账号状态语义：正常绿、已停用中性灰，颜色之外始终保留文字（FS-0010 v2 §6.4）。 */
const statusTone: Record<AdminUser['status'], { label: string; tone: BadgeTone; variant?: BadgeVariant }> = {
  active: { label: '正常', tone: 'success' },
  disabled: { label: '已停用', tone: 'neutral' },
};

export interface UserColumnOptions {
  open: (user: AdminUser, mode: 'edit' | 'detail') => void;
  remove: (user: AdminUser) => void;
  /** 本人账号不允许删除：由调用方给出当前操作员 ID。 */
  actorId?: string;
  /** 触屏 / 窄屏：行内操作与列宽退化为纯图标。 */
  compact: boolean;
  /** 删除进行中禁用入口，避免重复提交。 */
  busy: boolean;
}

/**
 * 表格只负责最小账号投影及语义事件，不决定服务端授权。
 *
 * 主标识（显示名称）可点击进入详情，保证键盘用户有进入路径；
 * 行内操作在悬停或聚焦时显现，但始终保留在 Tab 顺序内。
 * 破坏性动作（删除）在行内就地确认，不放进编辑/查看弹窗。
 */
export function userColumns(options: UserColumnOptions): DataTableColumns<AdminUser> {
  const { open, remove, actorId, compact, busy } = options;
  return [
    {
      title: '显示名称',
      key: 'displayName',
      width: 160,
      ellipsis: { tooltip: true },
      render: (row) =>
        h(
          'button',
          {
            type: 'button',
            class: 'admin-cell-link',
            onClick: (event: MouseEvent) => {
              event.stopPropagation();
              open(row, 'detail');
            },
          },
          row.displayName
        ),
    },
    { title: '邮箱', key: 'email', width: 220, ellipsis: { tooltip: true } },
    {
      title: '邮箱验证',
      key: 'emailVerified',
      width: 104,
      render: (row) =>
        row.emailVerified
          ? statusBadge('已验证', 'neutral')
          : statusBadge('未验证', 'warning'),
    },
    {
      title: '状态',
      key: 'status',
      width: 108,
      render: (row) => {
        const state = statusTone[row.status];
        return statusBadge(state.label, state.tone, state.variant);
      },
    },
    {
      title: '当前平台角色',
      key: 'roles',
      width: 190,
      render: (row) => row.roles.map((role) => roleLabels[role] ?? role).join('、') || '普通用户',
    },
    {
      title: '创建时间',
      key: 'createdAt',
      width: 170,
      className: 'admin-col-meta',
      render: (row) => h('span', { class: 'admin-cell-mono' }, new Date(row.createdAt).toLocaleString()),
    },
    {
      title: '操作',
      key: 'actions',
      width: actionColumnWidth(['详情', '编辑', '删除'], compact),
      fixed: 'right',
      align: 'right',
      render: (row) => {
        const isSelf = row.id === actorId;
        return rowActions([
          rowAction({ label: '详情', icon: 'eye', onClick: () => open(row, 'detail') }),
          rowAction({ label: '编辑', icon: 'edit', onClick: () => open(row, 'edit'), disabled: isSelf }),
          rowConfirm({
            label: '删除',
            icon: 'trash',
            disabled: isSelf || busy,
            message: `删除「${row.displayName}」后将撤销全部会话，邮箱不释放，历史记录保留。`,
            confirmLabel: '确认删除',
            onConfirm: () => remove(row),
          }),
        ]);
      },
    },
  ];
}
