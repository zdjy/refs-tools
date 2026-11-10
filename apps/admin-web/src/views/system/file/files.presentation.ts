import { h } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import type { AdminMedia } from '@refs-tools/contracts/admin-media';
import { actionColumnWidth, rowAction, rowActions } from '@/components/admin-shell/row-actions';
import { statusBadge } from '@/components/admin-shell/status-badge';
import type { BadgeTone, BadgeVariant } from '@/components/admin-shell/badge';

export const purposeOptions = [
  { label: '学习资料', value: 'learning' },
  { label: '认证证据', value: 'certification_evidence' },
  { label: '考试答卷', value: 'exam_answer' },
  { label: '论坛附件', value: 'forum_attachment' },
  { label: '赛后记录', value: 'post_game_record' },
  { label: '头像', value: 'avatar' },
];

export const statusOptions = [
  { label: '待上传', value: 'pending_upload' },
  { label: '可用', value: 'available' },
  { label: '核验拒绝', value: 'rejected' },
  { label: '已过期', value: 'expired' },
  { label: '已删除', value: 'deleted' },
];

/** 媒体状态语义：待上传待办黄、可用绿、核验拒绝红，过期与删除为虚线终态。 */
const statusTones: Record<AdminMedia['status'], { tone: BadgeTone; variant?: BadgeVariant }> = {
  pending_upload: { tone: 'warning' },
  available: { tone: 'success' },
  rejected: { tone: 'danger' },
  expired: { tone: 'warning', variant: 'outline' },
  deleted: { tone: 'neutral', variant: 'outline' },
};

/** 大小以二进制单位显示，保留字节数供详情精确核对。 */
export function formatBytes(bytes: number | null) {
  if (bytes === null) return '未核验';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1048576).toFixed(1)} MiB`;
}

/** 时间按操作员本地时区显示，空值明确表示尚无记录。 */
export function formatTime(value: string | null) {
  return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—';
}

/** 业务用途标签只作展示，不作为权限依据。 */
export function purposeLabel(value: AdminMedia['purpose']) {
  return purposeOptions.find((item) => item.value === value)?.label ?? value;
}

/** 媒体状态同时包含文字与语义颜色。 */
export function statusLabel(value: AdminMedia['status']) {
  return statusOptions.find((item) => item.value === value)?.label ?? value;
}

/** 已核验的证据不提供通用删除；服务端仍独立执行留存规则。 */
export function retained(media: AdminMedia) {
  return (
    media.status === 'available' &&
    ['certification_evidence', 'exam_answer', 'post_game_record'].includes(media.purpose)
  );
}

/** 归属账号以昵称 + UUID 尾号标识：昵称用于核对，尾号不扩散完整账号标识。 */
export function ownerLabel(media: Pick<AdminMedia, 'ownerUserId' | 'ownerDisplayName'>) {
  const tail = media.ownerUserId.slice(-4);
  return media.ownerDisplayName ? `${media.ownerDisplayName} · 尾号 ${tail}` : `未命名账号 · 尾号 ${tail}`;
}

export interface FileColumnOptions {
  open: (id: string) => void;
  /** 删除需填写理由，因此进入独立的删除弹窗，不再放进详情弹窗。 */
  remove: (media: AdminMedia) => void;
  compact: boolean;
  busy: boolean;
}

/** 表格渲染与组件库类型仅留在表现层。 */
export function fileColumns(options: FileColumnOptions): DataTableColumns<AdminMedia> {
  const { open, remove, compact, busy } = options;
  return [
    {
      title: '文件名',
      key: 'fileName',
      width: 240,
      ellipsis: { tooltip: true },
      render: (row) =>
        h(
          'button',
          {
            type: 'button',
            class: 'admin-cell-link',
            'aria-label': `管理文件 ${row.fileName ?? row.id}`,
            onClick: (event: MouseEvent) => {
              event.stopPropagation();
              open(row.id);
            },
          },
          row.fileName ?? '未命名文件'
        ),
    },
    { title: '用途', key: 'purpose', width: 100, render: (row) => purposeLabel(row.purpose) },
    {
      title: '状态',
      key: 'status',
      width: 112,
      render: (row) =>
        statusBadge(statusLabel(row.status), statusTones[row.status].tone, statusTones[row.status].variant),
    },
    { title: '类型', key: 'contentType', width: 150 },
    {
      title: '大小',
      key: 'expectedSizeBytes',
      width: 100,
      render: (row) => h('span', { class: 'admin-cell-mono' }, formatBytes(row.verifiedSizeBytes ?? row.expectedSizeBytes)),
    },
    { title: '所属用户', key: 'ownerDisplayName', width: 190, className: 'admin-col-meta', ellipsis: { tooltip: true }, render: (row) => ownerLabel(row) },
    {
      title: '创建时间',
      key: 'createdAt',
      width: 180,
      className: 'admin-col-meta',
      render: (row) => h('span', { class: 'admin-cell-mono' }, formatTime(row.createdAt)),
    },
    {
      title: '操作',
      key: 'actions',
      width: actionColumnWidth(['详情', '删除'], compact),
      fixed: 'right',
      align: 'right',
      render: (row) =>
        rowActions([
          rowAction({ label: '详情', icon: 'eye', onClick: () => open(row.id) }),
          rowAction({
            label: '删除',
            icon: 'trash',
            danger: true,
            disabled: busy || retained(row),
            onClick: () => remove(row),
          }),
        ]),
    },
  ];
}
