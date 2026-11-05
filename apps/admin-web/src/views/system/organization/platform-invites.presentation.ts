import { h } from 'vue';
import { NButton, NTag, type DataTableColumns } from 'naive-ui';
import type { PlatformInvite } from '@refs-tools/contracts/platform-invites';

const labels: Record<PlatformInvite['status'], string> = { active: '可使用', used: '已使用', expired: '已过期', revoked: '已撤销' };
const date = (value: string) => new Date(value).toLocaleString('zh-CN', { hour12: false });

/** 明文默认遮蔽：前缀与长度不变，保留 `ro_` 以便识别用途，其余按位替换。 */
export function maskInviteToken(token: string) {
  return token.startsWith('ro_') ? `ro_${'*'.repeat(token.length - 3)}` : '*'.repeat(token.length);
}

/** 只有仍可使用的码显示撤销入口；已使用的码展示其创建的组织标识，便于追溯。 */
export function inviteColumns(enabled: () => boolean, revoke: (invite: PlatformInvite) => void): DataTableColumns<PlatformInvite> {
  return [
    { title: '邀请码（末 4 位）', key: 'hint', width: 150, render: row => `…${row.hint}` },
    { title: '状态', key: 'status', width: 110, render: row => h(NTag, { bordered: false,
      type: row.status === 'active' ? 'success' : row.status === 'used' ? 'info' : 'default' }, () => labels[row.status]) },
    { title: '创建时间', key: 'createdAt', width: 180, render: row => date(row.createdAt) },
    { title: '过期时间', key: 'expiresAt', width: 180, render: row => date(row.expiresAt) },
    { title: '使用情况', key: 'usedAt', width: 260, render: row => row.usedAt && row.usedOrganizationId
      ? `${date(row.usedAt)} · 组织 ${row.usedOrganizationId.slice(0, 8)}` : '未使用' },
    { title: '操作', key: 'actions', width: 120, render: row => row.status === 'active'
      ? h(NButton, { size: 'large', disabled: !enabled(), onClick: () => revoke(row) }, () => '撤销') : '—' },
  ];
}
