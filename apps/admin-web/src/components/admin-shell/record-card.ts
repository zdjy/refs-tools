import type { BadgeTone, BadgeVariant } from './badge';
import type { AdminIconName } from './icons';

/** 卡片上的状态标签与表格状态列同源：文字 + 语义色 + 实底/虚线。 */
export interface RecordBadge {
  label: string;
  tone: BadgeTone;
  variant?: BadgeVariant;
}

/**
 * 行内动作描述：表格与移动端卡片共用同一份语义，各自决定渲染形态。
 *
 * - `action`：普通动作，表格用图标 + 悬浮提示，卡片用图标 + 文字。
 * - `confirm`：破坏性动作，渲染时就地确认气泡，不进入编辑/查看弹窗。
 */
export type RecordAction =
  | {
      kind: 'action';
      label: string;
      icon: AdminIconName;
      danger?: boolean;
      disabled?: boolean;
      onClick: () => void;
    }
  | {
      kind: 'confirm';
      label: string;
      icon: AdminIconName;
      message: string;
      confirmLabel?: string;
      /** 确认按钮的语义：批准类用 primary，驳回/移除/撤销用 danger（默认）。 */
      tone?: 'danger' | 'primary';
      disabled?: boolean;
      onConfirm: () => void;
    };

/** 卡片字段：值前面必须带字段名称，避免只看值猜不出含义。 */
export interface RecordField {
  label: string;
  value: string;
}

/** 窄屏卡片列表的一条记录：标题 + 状态标签 + 具名字段 + 操作。 */
export interface AdminRecordCard {
  key: string;
  title: string;
  /** 主标识点击（进入详情），不传则标题只作文本。 */
  onOpen?: () => void;
  badges?: RecordBadge[];
  fields: RecordField[];
  actions: RecordAction[];
}
