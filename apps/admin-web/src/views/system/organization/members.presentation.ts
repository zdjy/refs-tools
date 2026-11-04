import { h } from 'vue';
import { NButton, NSpace, NTag, type DataTableColumns } from 'naive-ui';
import type { Membership, OrganizationInvitation } from '@refs-tools/contracts/organization-members';
import type { MemberAction } from './useOrganizationMembers';

export const memberActionLabels = { approve: '批准入会', reject: '驳回申请', remove: '移除成员', revoke: '撤销邀请' };
const labels: Record<string, string> = { pending: '待处理', active: '正式成员', rejected: '已驳回', left: '已退出', removed: '已移除',
  accepted: '已接受', declined: '已拒绝', revoked: '已撤销', expired: '已过期' };
const status = (value: string) => h(NTag, { bordered: false, type: value === 'active' || value === 'accepted' ? 'success' : value === 'pending' ? 'warning' : 'default' }, { default: () => labels[value] });
const date = (value: string) => new Date(value).toLocaleString('zh-CN', { hour12: false });

/** 表格仅适配表现层；操作能力与可写状态由服务端及页面状态提供。 */
export function memberColumns(enabled: () => boolean, select: (value: MemberAction) => void, ownerId: () => string, actorId: () => string): DataTableColumns<Membership> {
  return [
    { title: '成员', key: 'displayName', width: 140 }, { title: '用户 ID', key: 'userId', width: 300 },
    { title: '状态', key: 'status', width: 110, render: row => status(row.status) },
    { title: '加入 / 申请时间', key: 'createdAt', width: 180, render: row => date(row.createdAt) },
    { title: '操作', key: 'actions', width: 230, render: row => {
      const actions: MemberAction['kind'][] = row.status === 'pending' ? ['approve', 'reject'] : row.status === 'active' && row.userId !== ownerId() && row.userId !== actorId() ? ['remove'] : [];
      return h(NSpace, {}, { default: () => actions.map(kind => h(NButton, { size: 'large', disabled: !enabled(),
        type: kind === 'approve' ? 'primary' : 'default', onClick: () => select({ kind, id: row.id, version: row.version, name: row.displayName }) }, { default: () => memberActionLabels[kind] })) });
    } },
  ];
}

/** 邀请历史始终保留，只有待回应记录显示撤销入口。 */
export function invitationColumns(enabled: () => boolean, select: (value: MemberAction) => void): DataTableColumns<OrganizationInvitation> {
  return [
    { title: '受邀人', key: 'displayName', width: 140 }, { title: '用户 ID', key: 'userId', width: 300 },
    { title: '状态', key: 'status', width: 110, render: row => status(row.status) },
    { title: '过期时间', key: 'expiresAt', width: 180, render: row => date(row.expiresAt) },
    { title: '操作', key: 'actions', width: 140, render: row => row.status === 'pending'
      ? h(NButton, { size: 'large', disabled: !enabled(), onClick: () => select({ kind: 'revoke', id: row.id, version: row.version, name: row.displayName }) }, { default: () => '撤销邀请' }) : '—' },
  ];
}
