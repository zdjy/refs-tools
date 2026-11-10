<script setup lang="ts">
  /**
   * 分页条：位于表格卡底部，左计数、右每页条数与页码。
   *
   * 控件 28px 高，触屏放大到 44px（FS-0010 v2 §5.1）。
   */
  import { computed } from 'vue';
  import { NPagination } from 'naive-ui';

  const props = withDefaults(
    defineProps<{
      page: number;
      total: number;
      pageSize?: number;
      countLabel?: (total: number) => string;
      disabled?: boolean;
    }>(),
    { pageSize: 20, countLabel: undefined, disabled: false }
  );
  const emit = defineEmits<{ 'update:page': [page: number] }>();

  const countText = computed(() =>
    props.countLabel ? props.countLabel(props.total) : `共 ${props.total} 条`
  );
</script>

<template>
  <div class="admin-pagination">
    <span class="pagination-count">{{ countText }}</span>
    <div class="pagination-controls">
      <span class="pagination-size">每页 {{ pageSize }} 条</span>
      <NPagination
        :page="page"
        :item-count="total"
        :page-size="pageSize"
        :page-slot="5"
        size="small"
        :disabled="disabled"
        @update:page="(value: number) => emit('update:page', value)"
      />
    </div>
  </div>
</template>

<style scoped>
  .admin-pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--admin-space-lg);
    width: 100%;
  }

  .pagination-count,
  .pagination-size {
    font-size: var(--admin-text-meta-size);
    color: var(--admin-muted);
    white-space: nowrap;
  }

  .pagination-controls {
    display: flex;
    align-items: center;
    gap: var(--admin-space-lg);
  }

  @media (pointer: coarse), (max-width: 767px) {
    .admin-pagination {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--admin-space-md);
    }

    .pagination-controls {
      width: 100%;
      justify-content: space-between;
    }

    .pagination-size {
      display: none;
    }
  }
</style>
