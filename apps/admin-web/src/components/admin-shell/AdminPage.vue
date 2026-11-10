<script setup lang="ts">
  /**
   * 页面标题行（FS-0010 v2 §5.1）。
   *
   * 铺在画布上，不套卡片：h1 + 描述 + 可选徽标，右侧最多 1 个主操作 + 1 个次操作。
   */
  defineProps<{
    title: string;
    description?: string;
  }>();
</script>

<template>
  <header class="admin-page-head">
    <div class="admin-page-head-main">
      <h1 class="admin-page-title">
        {{ title }}
        <slot name="badge" />
      </h1>
      <p v-if="description" class="admin-page-desc">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="admin-page-actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
  .admin-page-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--admin-space-xl);
    margin-bottom: var(--admin-space-xxl);
  }

  .admin-page-head-main {
    min-width: 0;
  }

  .admin-page-title {
    display: flex;
    align-items: center;
    gap: var(--admin-space-md);
    font-size: var(--admin-text-page-title-size);
    line-height: var(--admin-text-page-title-leading);
    font-weight: var(--admin-text-page-title-weight);
    letter-spacing: var(--admin-text-page-title-tracking);
    color: var(--admin-ink);
  }

  .admin-page-desc {
    margin-top: var(--admin-space-xs);
    font-size: var(--admin-text-body-size);
    line-height: var(--admin-text-body-leading);
    color: var(--admin-body);
  }

  .admin-page-actions {
    display: flex;
    align-items: center;
    gap: var(--admin-space-md);
    flex: none;
  }

  @media (pointer: coarse), (max-width: 767px) {
    .admin-page-head {
      flex-direction: column;
      gap: var(--admin-space-lg);
    }

    .admin-page-actions {
      width: 100%;
    }

    .admin-page-actions :deep(> *) {
      flex: 1;
    }
  }
</style>
