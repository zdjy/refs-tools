import { h } from 'vue';
import { NButton, NSpace, NTag, type DataTableColumns } from 'naive-ui';
import type { AdminUser } from '@refs-tools/contracts/admin-users';

export const roleLabels: Record<string, string> = {
  platform_admin: '平台管理员', content_editor: '内容编辑', grader: '阅卷员', moderator: '版主',
};
export const statusOptions = [{ label: '正常', value: 'active' }, { label: '已停用', value: 'disabled' }];

/** 表格只负责最小账号投影及语义事件，不决定服务端授权。 */
export function userColumns(open: (user: AdminUser, mode: 'edit' | 'detail') => void, actorId?: string): DataTableColumns<AdminUser> {
  return [
    { title: '显示名称', key: 'displayName', width: 160, ellipsis: { tooltip: true } },
    { title: '邮箱', key: 'email', width: 240, ellipsis: { tooltip: true } },
    { title: '邮箱验证', key: 'emailVerified', width: 110, render: (row) => row.emailVerified ? '已验证' : '未验证' },
    { title: '状态', key: 'status', width: 100, render: (row) => h(NTag, { bordered: false,
      type: row.status === 'active' ? 'success' : 'warning' }, { default: () => row.status === 'active' ? '正常' : '已停用' }) },
    { title: '当前平台角色', key: 'roles', width: 200, render: (row) => row.roles.map((role) => roleLabels[role] ?? role).join('、') || '普通用户' },
    { title: '创建时间', key: 'createdAt', width: 190, render: (row) => new Date(row.createdAt).toLocaleString() },
    { title: '操作', key: 'actions', width: 190, fixed: 'right', render: (row) => h(NSpace, {}, { default: () => [
      h(NButton, { size: 'large', onClick: () => open(row, 'detail') }, { default: () => '详情' }),
      h(NButton, { size: 'large', disabled: row.id === actorId, onClick: () => open(row, 'edit') }, { default: () => '编辑' }),
    ] }) },
  ];
}
