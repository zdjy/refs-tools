import { h } from 'vue';
import { NButton, NDropdown, NTag, type DataTableColumns } from 'naive-ui';
import type { AdminUser } from '@refs-tools/contracts/admin-users';
import { iconPaths } from '@/components/admin-shell/icons';

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

function iconSvg(name: keyof typeof iconPaths) {
  return h('svg', {
    width: 14,
    height: 14,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': 1.75,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
    innerHTML: iconPaths[name],
  });
}

/** 行内图标按钮：24px 视觉尺寸，命中区在 CSS 中放大到 44px（触屏）。 */
function rowIconButton(label: string, icon: keyof typeof iconPaths, onClick: () => void, disabled = false) {
  return h(
    NButton,
    {
      size: 'small',
      quaternary: true,
      circle: true,
      disabled,
      'aria-label': label,
      title: label,
      class: 'admin-row-action',
      onClick: (event: MouseEvent) => {
        event.stopPropagation();
        onClick();
      },
    },
    { default: () => iconSvg(icon) }
  );
}

/**
 * 表格只负责最小账号投影及语义事件，不决定服务端授权。
 *
 * 主标识（显示名称）可点击进入详情，保证键盘用户有进入路径；
 * 行内操作在悬停或聚焦时显现，但始终保留在 Tab 顺序内。
 */
export function userColumns(
  open: (user: AdminUser, mode: 'edit' | 'detail') => void,
  actorId?: string
): DataTableColumns<AdminUser> {
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
    { title: '邮箱', key: 'email', width: 240, ellipsis: { tooltip: true } },
    {
      title: '邮箱验证',
      key: 'emailVerified',
      width: 104,
      render: (row) => row.emailVerified ? '已验证' : '未验证',
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (row) =>
        h(
          NTag,
          {
            bordered: false,
            size: 'medium',
            type: row.status === 'active' ? 'success' : 'warning',
          },
          { default: () => (row.status === 'active' ? '正常' : '已停用') }
        ),
    },
    {
      title: '当前平台角色',
      key: 'roles',
      width: 200,
      render: (row) => row.roles.map((role) => roleLabels[role] ?? role).join('、') || '普通用户',
    },
    {
      title: '创建时间',
      key: 'createdAt',
      width: 180,
      className: 'admin-col-meta',
      render: (row) => h('span', { class: 'admin-cell-mono' }, new Date(row.createdAt).toLocaleString()),
    },
    {
      title: '操作',
      key: 'actions',
      width: 88,
      fixed: 'right',
      align: 'right',
      render: (row) => {
        const isSelf = row.id === actorId;
        return h('div', { class: 'admin-row-actions' }, [
          rowIconButton('查看详情', 'eye', () => open(row, 'detail')),
          rowIconButton('编辑用户', 'edit', () => open(row, 'edit'), isSelf),
          h(
            NDropdown,
            {
              trigger: 'click',
              placement: 'bottom-end',
              options: [
                { label: '查看详情', key: 'detail' },
                { label: '编辑用户', key: 'edit', disabled: isSelf },
              ],
              onSelect: (key: string) => open(row, key === 'edit' ? 'edit' : 'detail'),
            },
            { default: () => rowIconButton('更多操作', 'more', () => {}) }
          ),
        ]);
      },
    },
  ];
}
