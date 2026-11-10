<script setup lang="ts">
  /**
   * 工具栏：筛选控件左，操作按钮右；<768px 堆叠为单列。
   *
   * 标签与控件成对渲染时用 `label` 槽，不要只用占位符当标签（FS-0010 v2 §6.2）。
   */
</script>

<template>
  <div class="admin-filter-bar">
    <div class="admin-filter-fields">
      <slot />
    </div>
    <div v-if="$slots.actions" class="admin-filter-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
  .admin-filter-bar {
    display: flex;
    align-items: flex-end;
    align-content: flex-start;
    gap: var(--admin-space-lg);
    flex-wrap: wrap;
    margin-bottom: var(--admin-space-lg);
  }

  .admin-filter-fields {
    display: flex;
    align-items: flex-end;
    gap: var(--admin-space-lg);
    flex-wrap: wrap;
    min-width: 0;
    flex: 1 1 auto;
  }

  .admin-filter-actions {
    display: flex;
    align-items: center;
    gap: var(--admin-space-md);
    margin-left: auto;
    flex: none;
  }

  @media (pointer: coarse), (max-width: 767px) {
    .admin-filter-bar,
    .admin-filter-fields {
      gap: var(--admin-space-md);
    }

    .admin-filter-fields {
      flex-direction: column;
      align-items: stretch;
      width: 100%;
    }

    .admin-filter-actions {
      width: 100%;
      margin-left: 0;
    }

    .admin-filter-actions :deep(> *) {
      flex: 1;
    }
  }
</style>
