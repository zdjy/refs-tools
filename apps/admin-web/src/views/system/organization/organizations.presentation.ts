import { h } from 'vue';
import { NButton, NTag, type DataTableColumns } from 'naive-ui';
import type { Organization, OrganizationDecision } from '@refs-tools/contracts/organizations';

export const statusLabels: Record<Organization['status'], string> = {
  pending_review: '待审核', active: '正常运营', frozen: '已冻结', rejected: '已驳回', dissolved: '已解散',
};
export const statusOptions = Object.entries(statusLabels).map(([value, label]) => ({ value, label }));
export const actionLabels: Record<OrganizationDecision['action'], string> = {
  approve: '审核通过', reject: '驳回申请', freeze: '冻结组织', unfreeze: '解冻组织',
};
export const actionOptions: Record<Organization['status'], { label: string; value: OrganizationDecision['action'] }[]> = {
  pending_review: [{ label: '审核通过', value: 'approve' }, { label: '驳回申请', value: 'reject' }],
  active: [{ label: '冻结组织', value: 'freeze' }], frozen: [{ label: '解冻组织', value: 'unfreeze' }], rejected: [], dissolved: [],
};
export const actionDescriptions: Record<OrganizationDecision['action'], string> = {
  approve: '通过后，负责人将成为正式成员并获得组织所有者与组织者角色。',
  reject: '驳回后组织不能运营，申请资料和历史记录保留。',
  freeze: '冻结后禁止新入会、认证、赛事和选派；历史数据保留。',
  unfreeze: '解冻后恢复正常运营，已撤销的角色和已结束的成员关系不会恢复。',
};

/** 列表仅显示组织摘要；实名与联系方式只在详情中读取。 */
export function organizationColumns(open: (id: string) => void): DataTableColumns<Organization> {
  return [
    { title: '组织名称', key: 'name', width: 230, ellipsis: { tooltip: true } },
    { title: '地区', key: 'region', width: 140, render: row => row.region || '未填写' },
    { title: '用途', key: 'purpose', width: 240, ellipsis: { tooltip: true }, render: row => row.purpose || '未填写' },
    { title: '状态', key: 'status', width: 120, render: row => h(NTag, { bordered: false,
      type: row.status === 'active' ? 'success' : row.status === 'pending_review' ? 'warning' : 'default' }, () => statusLabels[row.status]) },
    { title: '创建时间', key: 'createdAt', width: 190, render: row => new Date(row.createdAt).toLocaleString() },
    { title: '操作', key: 'actions', width: 140, render: row => h(NButton, { size: 'large', onClick: () => open(row.id) }, () => '查看 / 管理') },
  ];
}
