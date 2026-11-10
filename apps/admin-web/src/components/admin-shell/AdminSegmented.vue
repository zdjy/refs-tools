<script setup lang="ts">
  /**
   * 分段控件：2–4 个互斥选项，`aria-pressed` 表达选中。
   * 界面设置抽屉与筛选形态共用，避免各页自建按钮组。
   */
  type Option = { value: string; label: string };

  defineProps<{ options: Option[]; value: string; label: string }>();
  defineEmits<{ 'update:value': [value: string] }>();
</script>

<template>
  <div class="segmented" role="group" :aria-label="label">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :aria-pressed="value === option.value"
      @click="$emit('update:value', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
  .segmented {
    display: inline-flex;
    gap: 2px;
    padding: 2px;
    flex: none;
    border-radius: var(--admin-radius-md);
    background: var(--admin-surface-muted);
  }

  .segmented button {
    height: 24px;
    padding: 0 var(--admin-space-lg);
    border: 0;
    border-radius: var(--admin-radius-sm);
    background: transparent;
    color: var(--admin-body);
    font-size: var(--admin-text-meta-size);
    font-weight: var(--admin-text-table-head-weight);
    cursor: pointer;
    transition: background-color var(--admin-motion-fast) var(--admin-motion-ease-out),
      color var(--admin-motion-fast) var(--admin-motion-ease-out);
  }

  .segmented button:hover {
    color: var(--admin-ink);
  }

  .segmented button[aria-pressed='true'] {
    background: var(--admin-surface);
    color: var(--admin-ink);
    box-shadow: var(--admin-shadow);
  }

  @media (pointer: coarse), (max-width: 767px) {
    .segmented button {
      height: 36px;
    }
  }
</style>
