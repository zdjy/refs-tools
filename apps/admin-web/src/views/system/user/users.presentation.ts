import { h } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import type { AdminUser } from '@refs-tools/contracts/admin-users';
import { actionColumnWidth, actionNode, rowActions } from '@/components/admin-shell/row-actions';
import { statusBadge } from '@/components/admin-shell/status-badge';
import type { RecordAction, AdminRecordCard } from '@/components/admin-shell/record-card';
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

const roleText = (user: AdminUser) => user.roles.map((role) => roleLabels[role] ?? role).join('、') || '普通用户';
const verifyBadge = (user: AdminUser) =>
  user.emailVerified ? { label: '已验证', tone: 'neutral' as BadgeTone } : { label: '未验证', tone: 'warning' as BadgeTone };

export interface UserColumnOptions {
  open: (user: AdminUser, mode: 'edit' | 'detail') => void;
  remove: (user: AdminUser) => void;
  /** 本人账号不允许删除：由调用方给出当前操作员 ID。 */
  actorId?: string;
  /** 触屏 / 窄屏：列宽按纯图标取值。 */
  compact: boolean;
  /** 删除进行中禁用入口，避免重复提交。 */
  busy: boolean;
}

/**
 * 行内动作只描述语义，由表格（图标 + 悬浮提示）和窄屏卡片（图标 + 文字）各自渲染。
 * 破坏性动作在原位就地确认，不进入编辑/查看弹窗。
 */
function userActions(row: AdminUser, options: UserColumnOptions): RecordAction[] {
  const isSelf = row.id === options.actorId;
  return [
    { kind: 'action', label: '详情', icon: 'eye', onClick: () => options.open(row, 'detail') },
    { kind: 'action', label: '编辑', icon: 'edit', disabled: isSelf, onClick: () => options.open(row, 'edit') },
    {
      kind: 'confirm',
      label: '删除',
      icon: 'trash',
      disabled: isSelf || options.busy,
      message: `删除「${row.displayName}」后将撤销全部会话，邮箱不释放，历史记录保留。`,
      confirmLabel: '确认删除',
      onConfirm: () => options.remove(row),
    },
  ];
}

/**
 * 表格只负责最小账号投影及语义事件，不决定服务端授权。
 *
 * 主标识（显示名称）可点击进入详情，保证键盘用户有进入路径；
 * 行内操作在悬停或聚焦时显现，但始终保留在 Tab 顺序内。
 */
export function userColumns(options: UserColumnOptions): DataTableColumns<AdminUser> {
  const { open, compact } = options;
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
      render: (row) => {
        const badge = verifyBadge(row);
        return statusBadge(badge.label, badge.tone);
      },
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
    { title: '当前平台角色', key: 'roles', width: 190, render: roleText },
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
      render: (row) => rowActions(userActions(row, options).map(actionNode)),
    },
  ];
}

/** 窄屏卡片：状态标签 + 具名字段（邮箱 / 角色 / 创建时间），操作常显。 */
export function userCards(rows: AdminUser[], options: UserColumnOptions): AdminRecordCard[] {
  return rows.map((row) => ({
    key: row.id,
    title: row.displayName,
    onOpen: () => options.open(row, 'detail'),
    badges: [statusTone[row.status], verifyBadge(row)],
    fields: [
      { label: '邮箱', value: row.email },
      { label: '平台角色', value: roleText(row) },
      { label: '创建时间', value: new Date(row.createdAt).toLocaleString() },
    ],
    actions: userActions(row, options),
  }));
}
