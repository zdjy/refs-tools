<script setup lang="ts">
  /**
   * 数据表格卡：surface 底 + 1px 边框 + 6px 圆角 + 粘性表头。
   *
   * 只负责密度、空态与加载呈现，列定义仍由页面通过 `columns` 传入。
   * 加载态沿用 `UiLoadingHint` 的慢速/超时协议，不新增第二套。
   */
  import { computed } from 'vue';
  import { NDataTable, NEmpty } from 'naive-ui';
  import type { DataTableColumns } from 'naive-ui';
  import UiLoadingHint from '@/components/ui/UiLoadingHint.vue';
  import AdminIcon from './AdminIcon.vue';

  const props = withDefaults(
    defineProps<{
      columns: DataTableColumns<any>;
      data: any[];
      loading?: boolean;
      rowKey: (row: any) => string;
      emptyText?: string;
      emptyHint?: string;
      scrollX?: number;
    }>(),
    {
      loading: false,
      emptyText: '暂无数据',
      emptyHint: undefined,
      scrollX: undefined,
    }
  );
  const emit = defineEmits<{ retry: []; 'row-click': [row: any] }>();

  /**
   * 行点击时把焦点移到该行的主标识按钮：弹窗关闭后焦点能回到原来的行，
   * 键盘用户和鼠标用户都有确定的返回位置。
   */
  function onRowClick(row: any, event: MouseEvent) {
    const tr = (event.target as HTMLElement | null)?.closest('tr');
    tr?.querySelector<HTMLElement>('.admin-cell-link')?.focus();
    emit('row-click', row);
  }

  const rowHeight = computed(() => 'var(--admin-row-height)');
</script>

<template>
  <div class="admin-table-card">
    <UiLoadingHint :loading="loading" label="读取列表" @retry="emit('retry')" />

    <div class="admin-table-scroll">
      <NDataTable
        :columns="columns"
        :data="data"
        :loading="loading"
        :row-key="rowKey"
        :scroll-x="scrollX"
        :bordered="false"
        :single-line="false"
        size="small"
        :style="{ '--admin-table-row-height': rowHeight }"
        @update:checked-row-keys="() => {}"
        @row-click="onRowClick"
      >
        <template #empty>
          <NEmpty :description="emptyText">
            <template #icon>
              <AdminIcon name="inbox" :size="32" />
            </template>
            <template v-if="emptyHint" #extra>
              <p class="empty-hint">{{ emptyHint }}</p>
            </template>
          </NEmpty>
        </template>
      </NDataTable>
    </div>

    <div v-if="$slots.footer" class="admin-table-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
  .admin-table-card {
    display: flex;
    flex-direction: column;
    min-width: 0;
    background: var(--admin-surface);
    border: 1px solid var(--admin-line);
    border-radius: var(--admin-radius-md);
    box-shadow: var(--admin-shadow);
    overflow: hidden;
  }

  .admin-table-card :deep(.admin-table-scroll) {
    min-width: 0;
    overflow-x: auto;
  }

  /* 行高由密度变量控制，表头固定 32px。 */
  .admin-table-card :deep(.n-data-table-tr) {
    height: var(--admin-row-height);
  }

  .admin-table-card :deep(.n-data-table-th) {
    height: var(--admin-head-height);
    background: var(--admin-surface-muted);
    font-size: var(--admin-text-table-head-size);
    font-weight: var(--admin-text-table-head-weight);
    letter-spacing: var(--admin-text-table-head-tracking);
    color: var(--admin-body);
  }

  .admin-table-card :deep(.n-data-table-td) {
    font-size: var(--admin-text-body-size);
    color: var(--admin-ink);
  }

  .admin-table-card :deep(.n-data-table-tr:hover .n-data-table-td) {
    background: var(--admin-surface-muted);
  }

  .admin-table-card :deep(.n-data-table-tr.is-selected .n-data-table-td) {
    background: var(--admin-accent-soft);
  }

  .empty-hint {
    max-width: 360px;
    font-size: var(--admin-text-meta-size);
    color: var(--admin-muted);
    text-align: center;
  }

  .admin-table-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--admin-space-lg);
    min-height: 48px;
    padding: 0 var(--admin-space-lg);
    border-top: 1px solid var(--admin-line);
    font-size: var(--admin-text-meta-size);
    color: var(--admin-muted);
  }

  @media (pointer: coarse), (max-width: 767px) {
    .admin-table-footer {
      flex-direction: column;
      align-items: stretch;
      padding: var(--admin-space-md);
    }
  }
</style>
