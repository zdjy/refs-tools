<script setup lang="ts">
  /**
   * 状态提示条：错误、离线、成功三类。
   *
   * 必须带 `role`，文案直说状态与下一步（FS-0010 v2 §5.3）。
   */
  import AdminIcon from './AdminIcon.vue';
  import type { AdminIconName } from './icons';

  type Tone = 'danger' | 'warning' | 'success' | 'info';

  const props = withDefaults(defineProps<{ tone: Tone; message: string; action?: string }>(), {
    action: undefined,
  });
  const emit = defineEmits<{ action: [] }>();

  const iconByTone: Record<Tone, AdminIconName> = {
    danger: 'alert',
    warning: 'alert',
    success: 'check',
    info: 'info',
  };

  const role = props.tone === 'danger' || props.tone === 'warning' ? 'alert' : 'status';
</script>

<template>
  <div class="admin-banner" :class="`is-${tone}`" :role="role">
    <AdminIcon :name="iconByTone[tone]" class="banner-icon" />
    <span class="banner-text">{{ message }}</span>
    <button v-if="action" type="button" class="banner-action" @click="emit('action')">
      {{ action }}
    </button>
  </div>
</template>

<style scoped>
  .admin-banner {
    display: flex;
    align-items: center;
    gap: var(--admin-space-md);
    margin-bottom: var(--admin-space-lg);
    padding: var(--admin-space-md) var(--admin-space-lg);
    border: 1px solid transparent;
    border-radius: var(--admin-radius-md);
    font-size: var(--admin-text-body-size);
    line-height: var(--admin-text-body-leading);
  }

  .banner-icon {
    flex: none;
  }

  .banner-text {
    min-width: 0;
  }

  .banner-action {
    margin-left: auto;
    flex: none;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font-size: inherit;
    font-weight: 500;
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
  }

  .is-danger {
    background: var(--admin-accent-soft);
    border-color: color-mix(in srgb, var(--admin-danger) 18%, transparent);
    color: var(--admin-danger-hover);
  }

  .is-warning {
    background: var(--admin-status-warning);
    border-color: color-mix(in srgb, var(--admin-warning) 18%, transparent);
    color: var(--admin-warning);
  }

  .is-success {
    background: var(--admin-status-success);
    border-color: color-mix(in srgb, var(--admin-success) 18%, transparent);
    color: var(--admin-success);
  }

  .is-info {
    background: var(--admin-surface-muted);
    border-color: var(--admin-line);
    color: var(--admin-body);
  }

  @media (pointer: coarse), (max-width: 767px) {
    .admin-banner {
      align-items: flex-start;
      flex-wrap: wrap;
    }

    .banner-action {
      margin-left: 0;
      min-height: 44px;
    }
  }
</style>
