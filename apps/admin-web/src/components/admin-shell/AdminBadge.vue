<script setup lang="ts">
  /**
   * 状态标签：20px 高、4px 圆角、12px/500。
   *
   * 颜色之外必须有文字，圆点只是辅助（FS-0010 v2 §6.4）。
   */
  type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'mock';

  withDefaults(defineProps<{ tone?: Tone }>(), { tone: 'neutral' });
</script>

<template>
  <span class="admin-badge" :class="`is-${tone}`">
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
    background: var(--admin-status-success);
    color: var(--admin-success);
  }

  .is-warning {
    background: var(--admin-status-warning);
    color: var(--admin-warning);
  }

  .is-danger {
    background: var(--admin-accent-soft);
    color: var(--admin-danger-hover);
  }

  .is-neutral {
    background: var(--admin-surface-muted);
    color: var(--admin-body);
  }

  /* Mock 标识只说明数据来源，不需要状态圆点。 */
  .is-mock {
    background: var(--admin-surface-muted);
    color: var(--admin-body);
    border: 1px dashed var(--admin-line-strong);
  }

  .is-mock::before {
    display: none;
  }
</style>
