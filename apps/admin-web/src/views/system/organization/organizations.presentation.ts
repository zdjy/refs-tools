import { h } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import type { Organization, OrganizationDecision } from '@refs-tools/contracts/organizations';
import { actionColumnWidth, rowAction, rowActions } from '@/components/admin-shell/row-actions';
import { statusBadge } from '@/components/admin-shell/status-badge';
import type { BadgeTone, BadgeVariant } from '@/components/admin-shell/badge';

export const statusLabels: Record<Organization['status'], string> = {
  pending_review: '待审核',
  active: '正常运营',
  frozen: '已冻结',
  rejected: '已驳回',
  dissolved: '已解散',
};

export const statusOptions = Object.entries(statusLabels).map(([value, label]) => ({ value, label }));

export const actionLabels: Record<OrganizationDecision['action'], string> = {
  approve: '审核通过',
  reject: '驳回申请',
  freeze: '冻结组织',
  unfreeze: '解冻组织',
};

export const actionOptions: Record<
  Organization['status'],
  { label: string; value: OrganizationDecision['action'] }[]
> = {
  pending_review: [
    { label: '审核通过', value: 'approve' },
    { label: '驳回申请', value: 'reject' },
  ],
  active: [{ label: '冻结组织', value: 'freeze' }],
  frozen: [{ label: '解冻组织', value: 'unfreeze' }],
  rejected: [],
  dissolved: [],
};

/**
 * 治理操作的语义：通过/解冻用 success，驳回/冻结用 error。
 * 主按钮是墨黑（solid），不参与这里的语义区分。
 */
export const actionTypes: Record<OrganizationDecision['action'], 'success' | 'error'> = {
  approve: 'success',
  reject: 'error',
  freeze: 'error',
  unfreeze: 'success',
};

export const actionDescriptions: Record<OrganizationDecision['action'], string> = {
  approve: '通过后，负责人将成为正式成员并获得组织所有者与组织者角色。',
  reject: '驳回后组织不能运营，申请资料和历史记录保留。',
  freeze: '冻结后禁止新入会、认证、赛事和选派；历史数据保留。',
  unfreeze: '解冻后恢复正常运营，已撤销的角色和已结束的成员关系不会恢复。',
};

/**
 * 状态语义：待审核待办黄、正常绿、冻结红、驳回与解散为终态虚线。
 * 颜色之外始终保留文字，同一列表内不同状态颜色与样式均不同（FS-0010 v2 §6.4）。
 */
const statusTone: Record<Organization['status'], { tone: BadgeTone; variant?: BadgeVariant }> = {
  pending_review: { tone: 'warning' },
  active: { tone: 'success' },
  frozen: { tone: 'danger' },
  rejected: { tone: 'danger', variant: 'outline' },
  dissolved: { tone: 'neutral', variant: 'outline' },
};

export interface OrganizationColumnOptions {
  open: (id: string) => void;
  members?: (organization: Organization) => void;
  transfer?: (organization: Organization) => void;
  /** 触屏 / 窄屏：行内操作与列宽退化为纯图标。 */
  compact: boolean;
}

/**
 * 列表仅显示组织摘要；实名与联系方式只在详情中读取。
 * 移交所有权入口只对 active / frozen 显示：待审核、已驳回、已解散的组织服务端也会拒绝。
 */
export function organizationColumns(options: OrganizationColumnOptions): DataTableColumns<Organization> {
  const { open, members, transfer, compact } = options;
  return [
    {
      title: '组织名称',
      key: 'name',
      width: 220,
      ellipsis: { tooltip: true },
      render: (row) =>
        h(
          'button',
          {
            type: 'button',
            class: 'admin-cell-link',
            onClick: (event: MouseEvent) => {
              event.stopPropagation();
              open(row.id);
            },
          },
          row.name
        ),
    },
    { title: '地区', key: 'region', width: 130, render: (row) => row.region || '未填写' },
    { title: '用途', key: 'purpose', width: 210, ellipsis: { tooltip: true }, render: (row) => row.purpose || '未填写' },
    {
      title: '状态',
      key: 'status',
      width: 112,
      render: (row) => {
        const state = statusTone[row.status];
        return statusBadge(statusLabels[row.status], state.tone, state.variant);
      },
    },
    {
      title: '创建时间',
      key: 'createdAt',
      width: 172,
      className: 'admin-col-meta',
      render: (row) => h('span', { class: 'admin-cell-mono' }, new Date(row.createdAt).toLocaleString()),
    },
    {
      title: '操作',
      key: 'actions',
      width: actionColumnWidth(['详情', '成员', '移交'], compact),
      fixed: 'right',
      align: 'right',
      render: (row) => {
        const canTransfer = !!transfer && (row.status === 'active' || row.status === 'frozen');
        return rowActions([
          rowAction({ label: '详情', icon: 'eye', onClick: () => open(row.id) }),
          members ? rowAction({ label: '成员', icon: 'users', onClick: () => members(row) }) : null,
          canTransfer
            ? rowAction({ label: '移交', icon: 'key', onClick: () => transfer?.(row) })
            : null,
        ]);
      },
    },
  ];
}
