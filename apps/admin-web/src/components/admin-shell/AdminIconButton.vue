<script setup lang="ts">
  /**
   * 图标按钮：28×28（触屏 44×44 命中区），统一焦点环与悬停底色。
   * 必须提供 `label`，用于 aria-label 与 Tooltip。
   */
  import AdminIcon from './AdminIcon.vue';
  import type { AdminIconName } from './icons';

  withDefaults(defineProps<{ icon: AdminIconName; label: string; size?: number; disabled?: boolean }>(), {
    size: 16,
    disabled: false,
  });
  defineEmits<{ click: [event: MouseEvent] }>();
</script>

<template>
  <button
    type="button"
    class="admin-icon-button"
    :aria-label="label"
    :title="label"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <AdminIcon :name="icon" :size="size" />
  </button>
</template>

<style scoped>
  .admin-icon-button {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 0;
    border-radius: var(--admin-radius-md);
    background: transparent;
    color: var(--admin-body);
    cursor: pointer;
    transition: background-color var(--admin-motion-fast) var(--admin-motion-ease-out),
      color var(--admin-motion-fast) var(--admin-motion-ease-out);
  }

  .admin-icon-button:hover {
    background: var(--admin-surface-muted);
    color: var(--admin-ink);
  }

  .admin-icon-button:disabled {
    color: var(--admin-muted);
    cursor: not-allowed;
    opacity: 0.6;
  }

  .admin-icon-button:active {
    transform: scale(0.96);
  }

  @media (pointer: coarse), (max-width: 767px) {
    .admin-icon-button {
      width: 44px;
      height: 44px;
    }
  }
</style>
