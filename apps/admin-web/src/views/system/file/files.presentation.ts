import { h } from 'vue';
import { NButton, NTag, type DataTableColumns } from 'naive-ui';
import type { AdminMedia } from '@refs-tools/contracts/admin-media';

export const purposeOptions = [
  { label: '学习资料', value: 'learning' }, { label: '认证证据', value: 'certification_evidence' },
  { label: '考试答卷', value: 'exam_answer' }, { label: '论坛附件', value: 'forum_attachment' }, { label: '赛后记录', value: 'post_game_record' },
  { label: '头像', value: 'avatar' },
];
export const statusOptions = [
  { label: '待上传', value: 'pending_upload' }, { label: '可用', value: 'available' },
  { label: '核验拒绝', value: 'rejected' }, { label: '已过期', value: 'expired' }, { label: '已删除', value: 'deleted' },
];
const statusTypes = { pending_upload: 'warning', available: 'success', rejected: 'error', expired: 'default', deleted: 'default' } as const;
/** 大小以二进制单位显示，保留字节数供详情精确核对。 */
export function formatBytes(bytes: number | null) {
  if (bytes === null) return '未核验';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1048576).toFixed(1)} MiB`;
}
/** 时间按操作员本地时区显示，空值明确表示尚无记录。 */
export function formatTime(value: string | null) { return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—'; }
/** 业务用途标签只作展示，不作为权限依据。 */
export function purposeLabel(value: AdminMedia['purpose']) { return purposeOptions.find(item => item.value === value)?.label ?? value; }
/** 媒体状态同时包含文字与语义颜色。 */
export function statusLabel(value: AdminMedia['status']) { return statusOptions.find(item => item.value === value)?.label ?? value; }
/** 已核验的证据不提供通用删除；服务端仍独立执行留存规则。 */
export function retained(media: AdminMedia) { return media.status === 'available' && ['certification_evidence', 'exam_answer', 'post_game_record'].includes(media.purpose); }
/** 表格渲染与组件库类型仅留在表现层。 */
export function fileColumns(open: (id: string) => void): DataTableColumns<AdminMedia> {
  return [
    { title: '文件名', key: 'fileName', width: 240, ellipsis: { tooltip: true }, render: row => row.fileName ?? '未命名文件' },
    { title: '用途', key: 'purpose', width: 110, render: row => purposeLabel(row.purpose) },
    { title: '状态', key: 'status', width: 110, render: row => h(NTag, { type: statusTypes[row.status], bordered: false }, { default: () => statusLabel(row.status) }) },
    { title: '类型', key: 'contentType', width: 160 },
    { title: '大小', key: 'expectedSizeBytes', width: 120, render: row => formatBytes(row.verifiedSizeBytes ?? row.expectedSizeBytes) },
    { title: '所属用户 ID', key: 'ownerUserId', width: 200, ellipsis: { tooltip: true } },
    { title: '创建时间', key: 'createdAt', width: 180, render: row => formatTime(row.createdAt) },
    { title: '操作', key: 'actions', width: 100, fixed: 'right', render: row => h(NButton, { size: 'large', onClick: () => open(row.id), 'aria-label': `管理文件 ${row.fileName ?? row.id}` }, { default: () => '管理' }) },
  ];
}
