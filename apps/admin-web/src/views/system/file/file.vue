<script setup lang="ts">
  import { NButton, NInput, NSelect } from 'naive-ui';
  import { useUiFeedback } from '../../../components/ui/useUiFeedback';
  import UiLoadingHint from '../../../components/ui/UiLoadingHint.vue';
  import FileDetail from './components/FileDetail.vue';
  import { fileColumns, purposeOptions, retained, statusOptions } from './files.presentation';
  import { useFiles } from './useFiles';
  import AdminPage from '@/components/admin-shell/AdminPage.vue';
  import AdminFilterBar from '@/components/admin-shell/AdminFilterBar.vue';
  import AdminField from '@/components/admin-shell/AdminField.vue';
  import AdminDataTable from '@/components/admin-shell/AdminDataTable.vue';
  import AdminPagination from '@/components/admin-shell/AdminPagination.vue';
  import AdminStateBanner from '@/components/admin-shell/AdminStateBanner.vue';
  import AdminDialogShell from '@/components/admin-shell/AdminDialogShell.vue';
  import AdminConfirmButton from '@/components/admin-shell/AdminConfirmButton.vue';
  import UiSubmitHint from '../../../components/ui/UiSubmitHint.vue';

  const {
    items, total, page, keyword, ownerUserId, purpose, status, selected, selectedId, showing, loading, detailLoading,
    busy, reason, error, formError, notice, online, load, reset, open, close, requestDelete, download, remove,
  } = useFiles();

  useUiFeedback(notice, 'info');
  const columns = fileColumns(open);

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
      <AdminField label="所属用户 ID" grow>
        <template #default="{ id }">
          <NInput :id="id" v-model:value="ownerUserId" :maxlength="36" clearable placeholder="填写完整用户 UUID" />
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
      title="文件详情与管理"
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
        <AdminConfirmButton
          class="footer-danger"
          :label="selected?.status === 'deleted' ? '重试对象删除' : '删除文件'"
          :message="`删除「${selected?.fileName ?? selected?.id ?? ''}」会先撤销访问再删除存储对象，无法撤销。`"
          confirm-label="确认删除"
          :disabled="busy || !online || !selected || retained(selected)"
          @update:open="(open: boolean) => open && requestDelete()"
          @confirm="remove"
        />
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

  .footer-danger {
    margin-right: auto;
  }
</style>
