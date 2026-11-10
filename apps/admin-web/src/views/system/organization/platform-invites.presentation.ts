import { h } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import type { PlatformInvite } from '@refs-tools/contracts/platform-invites';
import { actionColumnWidth, rowConfirm, rowActions } from '@/components/admin-shell/row-actions';
import type { AdminRecordCard } from '@/components/admin-shell/record-card';
import { statusBadge } from '@/components/admin-shell/status-badge';
import type { BadgeTone, BadgeVariant } from '@/components/admin-shell/badge';

const labels: Record<PlatformInvite['status'], string> = { active: '可使用', used: '已使用', expired: '已过期', revoked: '已撤销' };
const tones: Record<PlatformInvite['status'], { tone: BadgeTone; variant?: BadgeVariant }> = {
  active: { tone: 'success' },
  used: { tone: 'neutral' },
  expired: { tone: 'warning', variant: 'outline' },
  revoked: { tone: 'neutral', variant: 'outline' },
};
const date = (value: string) => new Date(value).toLocaleString('zh-CN', { hour12: false });

/** 明文默认遮蔽：前缀与长度不变，保留 `ro_` 以便识别用途，其余按位替换。 */
export function maskInviteToken(token: string) {
  return token.startsWith('ro_') ? `ro_${'*'.repeat(token.length - 3)}` : '*'.repeat(token.length);
}

/** 只有仍可使用的码显示撤销入口；撤销在行内就地确认（FS-0010 v2 §5.2）。 */
export function inviteColumns(
  enabled: () => boolean,
  revoke: (invite: PlatformInvite) => void,
  compact: boolean
): DataTableColumns<PlatformInvite> {
  return [
    { title: '邀请码（末 4 位）', key: 'hint', minWidth: 120, render: (row) => `…${row.hint}` },
    {
      title: '状态',
      key: 'status',
      width: 104,
      render: (row) => statusBadge(labels[row.status], tones[row.status].tone, tones[row.status].variant),
    },
    { title: '创建时间', key: 'createdAt', width: 168, render: (row) => date(row.createdAt) },
    { title: '过期时间', key: 'expiresAt', width: 168, render: (row) => date(row.expiresAt) },
    {
      title: '使用情况',
      key: 'usedAt',
      minWidth: 240,
      render: (row) =>
        row.usedAt && row.usedOrganizationId ? `${date(row.usedAt)} · 组织 ${row.usedOrganizationId.slice(0, 8)}` : '未使用',
    },
    {
      title: '操作',
      key: 'actions',
      width: actionColumnWidth(['撤销'], compact),
      align: 'right',
      render: (row) =>
        row.status === 'active'
          ? rowActions([
              rowConfirm({
                icon: 'ban',
                label: '撤销',
                message: `撤销以「${row.hint}」结尾的邀请码后立即失效，已创建的组织不受影响。`,
                confirmLabel: '确认撤销',
                disabled: !enabled(),
                onConfirm: () => revoke(row),
              }),
            ])
          : h('span', { class: 'admin-cell-meta' }, '—'),
    },
  ];
}

const badgeOf = (value: PlatformInvite['status']) => ({ label: labels[value], ...tones[value] });

/** 窄屏卡片：末 4 位 + 状态标签 + 创建/过期/使用情况 + 撤销（仅可使用）。 */
export function inviteCards(
  rows: PlatformInvite[],
  enabled: () => boolean,
  revoke: (invite: PlatformInvite) => void
): AdminRecordCard[] {
  return rows.map((row) => ({
    key: row.id,
    title: `邀请码 …${row.hint}`,
    badges: [badgeOf(row.status)],
    fields: [
      { label: '创建时间', value: date(row.createdAt) },
      { label: '过期时间', value: date(row.expiresAt) },
      {
        label: '使用情况',
        value: row.usedAt && row.usedOrganizationId
          ? `${date(row.usedAt)} · 组织 ${row.usedOrganizationId.slice(0, 8)}`
          : '未使用',
      },
    ],
    actions:
      row.status === 'active'
        ? [{
            kind: 'confirm' as const,
            icon: 'ban' as const,
            label: '撤销',
            message: `撤销以「${row.hint}」结尾的邀请码后立即失效，已创建的组织不受影响。`,
            confirmLabel: '确认撤销',
            disabled: !enabled(),
            onConfirm: () => revoke(row),
          }]
        : [],
  }));
}
