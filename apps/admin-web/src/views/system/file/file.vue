<script setup lang="ts">
  import { computed } from 'vue';
  import { NButton, NInput, NSelect } from 'naive-ui';
  import { useUiFeedback } from '../../../components/ui/useUiFeedback';
  import UiLoadingHint from '../../../components/ui/UiLoadingHint.vue';
  import FileDetail from './components/FileDetail.vue';
  import FileDeleteDialog from './components/FileDeleteDialog.vue';
  import { fileColumns, purposeOptions, statusOptions } from './files.presentation';
  import { useFiles } from './useFiles';
  import AdminPage from '@/components/admin-shell/AdminPage.vue';
  import AdminFilterBar from '@/components/admin-shell/AdminFilterBar.vue';
  import AdminField from '@/components/admin-shell/AdminField.vue';
  import AdminDataTable from '@/components/admin-shell/AdminDataTable.vue';
  import AdminPagination from '@/components/admin-shell/AdminPagination.vue';
  import AdminStateBanner from '@/components/admin-shell/AdminStateBanner.vue';
  import AdminDialogShell from '@/components/admin-shell/AdminDialogShell.vue';
  import UiSubmitHint from '../../../components/ui/UiSubmitHint.vue';
  import { useCompactViewport } from '@/components/admin-shell/useCompactViewport';

  const {
    items, total, page, keyword, ownerKeyword, purpose, status, selected, selectedId, showing, loading, detailLoading,
    busy, reason, error, formError, notice, deleteTarget, deleteReason, deleteError, online, load, reset, open, close,
    download, askRemove, cancelRemove, submitRemove,
  } = useFiles();

  useUiFeedback(notice, 'info');
  const compact = useCompactViewport();
  const columns = computed(() =>
    fileColumns({ open, remove: askRemove, compact: compact.value, busy: busy.value })
  );

  function startDownload() {
    void download((url) => {
      const link = document.createElement('a');
      link.href = url;
      link.rel = 'noopener noreferrer';
      link.referrerPolicy = 'no-referrer';
      link.target = '_blank';
      document.body.append(link);
      link.click();
      link.remove();
    });
  }
</script>

<template>
  <section class="page" aria-label="文件管理">
    <AdminPage title="文件管理" description="查询全平台媒体元数据，按理由下载或删除文件。新文件请通过对应业务入口直传，平台不接收文件内容。" />

    <AdminStateBanner
      v-if="!online"
      tone="warning"
      message="当前离线，列表可能已陈旧。恢复连接后请刷新，不支持离线下载授权或删除。"
    />
    <AdminStateBanner v-if="error" tone="danger" :message="error" action="重试" @action="load()" />

    <AdminFilterBar>
      <AdminField label="原文件名" grow>
        <template #default="{ id }">
          <NInput
            :id="id"
            v-model:value="keyword"
            :maxlength="200"
            clearable
            placeholder="按文件名搜索"
            @keyup.enter="load(1)"
          />
        </template>
      </AdminField>
      <AdminField label="所属用户" grow>
        <template #default="{ id }">
          <NInput
            :id="id"
            v-model:value="ownerKeyword"
            :maxlength="100"
            clearable
            placeholder="按昵称或实名搜索"
            @keyup.enter="load(1)"
          />
        </template>
      </AdminField>
      <AdminField label="用途" fixed="132px">
        <template #default="{ id }">
          <NSelect :id="id" v-model:value="purpose" :options="purposeOptions" clearable placeholder="全部用途" />
        </template>
      </AdminField>
      <AdminField label="状态" fixed="132px">
        <template #default="{ id }">
          <NSelect :id="id" v-model:value="status" :options="statusOptions" clearable placeholder="全部状态" />
        </template>
      </AdminField>
      <template #actions>
        <NButton quaternary :disabled="loading || !online" @click="reset">重置</NButton>
        <NButton type="primary" :disabled="loading || !online" @click="load(1)">查询</NButton>
      </template>
    </AdminFilterBar>

    <UiLoadingHint :loading="loading" label="读取文件列表" @retry="load()" />

    <AdminDataTable
      :columns="columns"
      :data="items"
      :loading="loading"
      :row-key="(row) => row.id"
      empty-text="没有匹配的文件记录"
      empty-hint="调整筛选条件后重新查询。"
      @retry="load()"
      @row-click="(row) => open(row.id)"
    >
      <template #footer>
        <AdminPagination
          :page="page"
          :total="Math.min(total, 200000)"
          :count-label="(value: number) => `共 ${value} 个文件`"
          :disabled="loading || !online"
          @update:page="load"
        />
      </template>
    </AdminDataTable>
    <p v-if="total > 200000" class="page-cap">最多浏览前 10000 页，请缩小筛选范围。</p>

    <AdminDialogShell
      :show="showing"
      title="文件详情"
      size="lg"
      :busy="busy"
      @update:show="!$event && close()"
    >
      <AdminStateBanner
        v-if="formError"
        tone="danger"
        :message="formError"
        action="重新读取详情"
        @action="open(selectedId)"
      />
      <AdminStateBanner v-if="!online" tone="warning" message="当前离线，输入暂时保留，恢复后请重新读取。" />
      <AdminStateBanner
        v-if="error"
        tone="warning"
        :message="`列表刷新失败，数据可能已陈旧：${error}`"
        action="重试刷新列表"
        @action="load()"
      />
      <AdminStateBanner v-if="notice" tone="success" :message="notice" />

      <FileDetail
        v-if="selected && !detailLoading"
        :file="selected"
        v-model:reason="reason"
        :busy="busy"
      />
      <div v-else class="detail-pending" role="status">
        {{ detailLoading ? '正在读取文件详情…' : '详情未就绪，请重新读取详情。' }}
      </div>

      <template #footer>
        <UiSubmitHint :busy="busy" />
        <NButton :disabled="busy" @click="close">关闭</NButton>
        <NButton
          type="primary"
          :loading="busy"
          :disabled="busy || !online || selected?.status !== 'available'"
          @click="startDownload"
        >
          授权下载
        </NButton>
      </template>
    </AdminDialogShell>

    <FileDeleteDialog
      :show="!!deleteTarget"
      :file="deleteTarget"
      :reason="deleteReason"
      :busy="busy"
      :error="deleteError"
      :online="online"
      @update:reason="deleteReason = $event"
      @close="cancelRemove"
      @confirm="submitRemove"
    />
  </section>
</template>

<style scoped>
  .page {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .page-cap {
    margin-top: var(--admin-space-md);
    font-size: var(--admin-text-meta-size);
    color: var(--admin-body);
  }

  .detail-pending {
    font-size: var(--admin-text-body-size);
    line-height: var(--admin-text-body-leading);
    color: var(--admin-body);
  }
</style>
