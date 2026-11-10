import { h, type VNode } from 'vue';
import { NButton } from 'naive-ui';
import AdminConfirmButton from './AdminConfirmButton.vue';
import AdminIcon from './AdminIcon.vue';
import type { AdminIconName } from './icons';

interface RowActionBase {
  /** 同时用作可访问名称与桌面端可见文字。 */
  label: string;
  icon: AdminIconName;
  disabled?: boolean;
  /** 破坏性动作使用危险色，仍保留文字而不只靠颜色。 */
  danger?: boolean;
}

/** 普通行内动作：PC 显示图标 + 文字，触屏/窄屏只保留图标（文字由 CSS 收起）。 */
export function rowAction(options: RowActionBase & { onClick: () => void }): VNode {
  return h(
    NButton,
    {
      size: 'small',
      quaternary: true,
      disabled: options.disabled,
      'aria-label': options.label,
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

/** 动作列宽度：桌面按「图标 + 文字」取值，触屏/窄屏按 44px 命中区取值。 */
export function actionColumnWidth(labels: string[], compact: boolean): number {
  if (compact) return labels.length * 44 + 12;
  const textWidth = labels.reduce((total, label) => total + label.length * 13 + 34, 0);
  return Math.max(64, textWidth + 16);
}
