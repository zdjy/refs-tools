import { h } from 'vue';
import AdminBadge from './AdminBadge.vue';
import type { BadgeTone, BadgeVariant } from './badge';

/**
 * 表格状态列的渲染助手：各页面只维护「状态 → 语义色」映射，
 * 标签形状、字号与对比度统一由 `AdminBadge` 提供（FS-0010 v2 §6.4）。
 */
export function statusBadge(label: string, tone: BadgeTone, variant: BadgeVariant = 'solid') {
  return h(AdminBadge, { tone, variant }, { default: () => label });
}
