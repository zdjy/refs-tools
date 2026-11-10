import { h } from 'vue';
import { NButton, NDropdown, NTag, type DataTableColumns } from 'naive-ui';
import type { Organization, OrganizationDecision } from '@refs-tools/contracts/organizations';
import { iconPaths } from '@/components/admin-shell/icons';

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

function statusTone(status: Organization['status']): 'success' | 'warning' | 'neutral' {
  if (status === 'active') return 'success';
  if (status === 'pending_review') return 'warning';
  return 'neutral';
}

/**
 * 列表仅显示组织摘要；实名与联系方式只在详情中读取。
 * 移交所有权入口只对 active / frozen 显示：待审核、已驳回、已解散的组织服务端也会拒绝。
 */
export function organizationColumns(
  open: (id: string) => void,
  members?: (organization: Organization) => void,
  transfer?: (organization: Organization) => void
): DataTableColumns<Organization> {
  return [
    {
      title: '组织名称',
      key: 'name',
      width: 230,
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
    { title: '用途', key: 'purpose', width: 230, ellipsis: { tooltip: true }, render: (row) => row.purpose || '未填写' },
    {
      title: '状态',
      key: 'status',
      width: 110,
      render: (row) =>
        h(NTag, { bordered: false, size: 'medium', type: 'default', class: `admin-tag-${statusTone(row.status)}` }, () =>
          statusLabels[row.status]
        ),
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
      width: 120,
      fixed: 'right',
      align: 'right',
      render: (row) => {
        const canTransfer = transfer && (row.status === 'active' || row.status === 'frozen');
        return h('div', { class: 'admin-row-actions' }, [
          rowIconButton('查看 / 管理', 'eye', () => open(row.id)),
          members ? rowIconButton('成员管理', 'users', () => members(row)) : null,
          canTransfer
            ? h(
                NDropdown,
                {
                  trigger: 'click',
                  placement: 'bottom-end',
                  options: [
                    { label: '查看 / 管理', key: 'detail' },
                    { label: '成员管理', key: 'members', disabled: !members },
                    { label: '移交所有权', key: 'transfer', disabled: !canTransfer },
                  ],
                  onSelect: (key: string) => {
                    if (key === 'detail') open(row.id);
                    else if (key === 'members') members?.(row);
                    else if (key === 'transfer') transfer?.(row);
                  },
                },
                { default: () => rowIconButton('更多操作', 'more', () => {}) }
              )
            : null,
        ]);
      },
    },
  ];
}
