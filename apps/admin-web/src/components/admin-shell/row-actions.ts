import { h, type VNode } from 'vue';
import { NButton } from 'naive-ui';
import AdminConfirmButton from './AdminConfirmButton.vue';
import AdminIcon from './AdminIcon.vue';
import type { AdminIconName } from './icons';
import type { RecordAction } from './record-card';

interface RowActionBase {
  /** 同时用作可访问名称与桌面端可见文字。 */
  label: string;
  icon: AdminIconName;
  disabled?: boolean;
  /** 破坏性动作使用危险色，仍保留文字而不只靠颜色。 */
  danger?: boolean;
}

/**
 * 普通行内动作：PC 只显示图标，操作名称由 `title` 悬浮提示给出；
 * 触屏/窄屏没有 hover，改为显示图标 + 文字（由 CSS 决定，见 `styles/index.less`）。
 */
export function rowAction(options: RowActionBase & { onClick: () => void }): VNode {
  return h(
    NButton,
    {
      size: 'small',
      quaternary: true,
      disabled: options.disabled,
      'aria-label': options.label,
      title: options.label,
      class: ['admin-row-action-button', options.danger ? 'is-danger' : ''],
      onClick: (event: MouseEvent) => {
        event.stopPropagation();
        options.onClick();
      },
    },
    {
      default: () => [
        h(AdminIcon, { name: options.icon, size: 14 }),
        h('span', { class: 'admin-row-action-label' }, options.label),
      ],
    }
  );
}

/** 破坏性行内动作：就地确认气泡，不再进入编辑/查看弹窗。 */
export function rowConfirm(
  options: RowActionBase & { message: string; confirmLabel?: string; onConfirm: () => void }
): VNode {
  return h(AdminConfirmButton, {
    variant: 'row',
    tone: options.danger === false ? 'primary' : 'danger',
    icon: options.icon,
    label: options.label,
    message: options.message,
    confirmLabel: options.confirmLabel ?? options.label,
    disabled: options.disabled,
    onConfirm: options.onConfirm,
  });
}

/** 行内操作容器：列宽与对齐由表格列决定，这里只负责横向排布。 */
export function rowActions(children: (VNode | null)[]): VNode {
  return h(
    'div',
    { class: 'admin-row-actions' },
    children.filter((child): child is VNode => Boolean(child))
  );
}

/** 动作列宽度：PC 只放图标（28px 一个），触屏/窄屏放「图标 + 文字」并保留 44px 命中区。 */
export function actionColumnWidth(labels: string[], compact: boolean): number {
  if (!compact) return Math.max(56, labels.length * 28 + 8);
  const textWidth = labels.reduce((total, label) => total + label.length * 13 + 34, 0);
  return Math.max(88, textWidth + 16);
}

/** 把行内动作描述渲染成表格单元格里的按钮（与移动端卡片共用同一份描述）。 */
export function actionNode(action: RecordAction): VNode {
  if (action.kind === 'confirm') {
    return rowConfirm({
      label: action.label,
      icon: action.icon,
      message: action.message,
      confirmLabel: action.confirmLabel,
      // rowConfirm 用 `danger: false` 表达主色确认；未指定时保持危险色。
      danger: action.tone === 'primary' ? false : undefined,
      disabled: action.disabled,
      onConfirm: action.onConfirm,
    });
  }
  return rowAction({
    label: action.label,
    icon: action.icon,
    danger: action.danger,
    disabled: action.disabled,
    onClick: action.onClick,
  });
}
