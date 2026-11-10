<script setup lang="ts">
  /**
   * 状态标签：20px 高、4px 圆角、12px/500，颜色之外必须带文字（FS-0010 v2 §6.4）。
   *
   * - tone 表达语义：success 正常 / warning 待办或进行中 / danger 受限或失败 / neutral 中性。
   * - variant 表达阶段：solid 当前生效，outline（虚线）表示终态或等待对方处理，
   *   两者组合让同一列表里的不同状态既不同色也不只靠颜色区分。
   */
  import type { BadgeTone, BadgeVariant } from './badge';

  withDefaults(defineProps<{ tone?: BadgeTone; variant?: BadgeVariant }>(), {
    tone: 'neutral',
    variant: 'solid',
  });
</script>

<template>
  <span class="admin-badge" :class="[`is-${tone}`, `is-${variant}`]">
    <slot />
  </span>
</template>

<style scoped>
  .admin-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--admin-space-sm);
    height: 20px;
    padding: 0 var(--admin-space-sm);
    border: 1px solid transparent;
    border-radius: var(--admin-radius-sm);
    font-size: var(--admin-text-badge-size);
    line-height: var(--admin-text-badge-leading);
    font-weight: var(--admin-text-badge-weight);
    white-space: nowrap;
  }

  .admin-badge::before {
    content: '';
    width: 6px;
    height: 6px;
    flex: none;
    border-radius: var(--admin-radius-full);
    background: currentColor;
  }

  .is-success {
    color: var(--admin-success);
  }

  .is-warning {
    color: var(--admin-warning);
  }

  .is-danger {
    color: var(--admin-danger-hover);
  }

  .is-neutral {
    color: var(--admin-body);
  }

  .is-solid.is-success {
    background: var(--admin-status-success);
  }

  .is-solid.is-warning {
    background: var(--admin-status-warning);
  }

  .is-solid.is-danger {
    background: var(--admin-status-danger);
  }

  .is-solid.is-neutral {
    background: var(--admin-surface-muted);
  }

  /* 虚线表示终态或等待对方处理：底色清空，只保留语义色描边与文字。 */
  .is-outline {
    background: transparent;
    border-style: dashed;
    border-color: currentColor;
  }

  /* 中性虚线标签仍是真实文字，用 body 保证对比度，muted 只留给占位符与图标。 */
  .is-outline.is-neutral {
    color: var(--admin-body);
    border-color: var(--admin-line-strong);
  }
</style>
