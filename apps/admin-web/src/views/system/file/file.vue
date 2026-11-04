<script setup lang="ts">
  import { NAlert, NButton, NCard, NDataTable, NForm, NFormItem, NInput, NModal, NPagination, NSelect, NSpace } from 'naive-ui';
  import FileDetail from './components/FileDetail.vue';
  import { fileColumns, purposeOptions, statusOptions } from './files.presentation';
  import { useFiles } from './useFiles';

  const { items, total, page, keyword, ownerUserId, purpose, status, selected, selectedId, showing, loading, detailLoading, busy,
    confirming, reason, error, formError, notice, online, load, reset, open, close, requestDelete, download, remove } = useFiles();
  const columns = fileColumns(open);
  function startDownload() {
    void download(url => {
      const link = document.createElement('a');
      link.href = url; link.rel = 'noopener noreferrer'; link.referrerPolicy = 'no-referrer';
      link.target = '_blank'; document.body.append(link); link.click(); link.remove();
    });
  }
</script>

<template>
  <section class="min-w-0 space-y-4" aria-label="文件管理">
    <NCard title="文件管理" :bordered="false">
      <p class="m-0 text-admin-body">查询全平台媒体元数据，按理由下载或删除文件。新文件请通过对应业务入口直传，平台不接收文件内容。</p>
    </NCard>
    <NAlert v-if="!online" type="warning" title="当前离线">列表可能已陈旧。恢复连接后请刷新，不支持离线下载授权或删除。</NAlert>
    <NAlert v-if="notice" type="success" role="status">{{ notice }}</NAlert>
    <NCard :bordered="false">
      <NForm size="large" @submit.prevent="load(1)">
        <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <NFormItem label="原文件名"><NInput v-model:value="keyword" :maxlength="200" clearable placeholder="按文件名搜索" :input-props="{ 'aria-label': '搜索文件名' }" /></NFormItem>
          <NFormItem label="所属用户 ID"><NInput v-model:value="ownerUserId" :maxlength="36" clearable placeholder="填写完整用户 UUID" :input-props="{ 'aria-label': '筛选文件所属用户' }" /></NFormItem>
          <NFormItem label="用途"><NSelect v-model:value="purpose" :options="purposeOptions" clearable aria-label="筛选文件用途" placeholder="全部用途" /></NFormItem>
          <NFormItem label="状态"><NSelect v-model:value="status" :options="statusOptions" clearable aria-label="筛选文件状态" placeholder="全部状态" /></NFormItem>
        </div>
        <NSpace class="mb-4">
          <NButton attr-type="submit" type="primary" size="large" :disabled="loading || !online">查询</NButton>
          <NButton size="large" :disabled="loading || !online" @click="reset">重置</NButton>
          <NButton size="large" :disabled="loading || !online" @click="load()">刷新</NButton>
        </NSpace>
      </NForm>
      <NAlert v-if="error" type="error" title="读取失败，当前列表可能已陈旧" role="alert" class="mb-4">
        {{ error }} <NButton size="large" :disabled="loading || !online" @click="load()">重试</NButton>
      </NAlert>
      <div class="min-w-0 overflow-x-auto">
        <NDataTable :columns="columns" :data="items" :loading="loading" :row-key="row => row.id" :scroll-x="1420">
          <template #empty>没有匹配的文件记录</template>
        </NDataTable>
      </div>
      <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span>共 {{ total }} 个文件</span>
        <NPagination :page="page" :item-count="Math.min(total, 200000)" :page-size="20" :page-slot="3" size="large"
          :disabled="loading || !online" @update:page="load" />
      </div>
      <p v-if="total > 200000" class="text-admin-body">最多浏览前 10000 页，请缩小筛选范围。</p>
    </NCard>
    <NModal :show="showing" preset="card" title="文件详情与管理" class="max-h-[calc(100dvh-32px)] overflow-y-auto"
      :style="{ width: 'min(720px, calc(100vw - 32px))' }" :mask-closable="!busy" :close-on-esc="!busy" :closable="false"
      @update:show="!$event && close()">
      <NAlert v-if="formError" type="error" title="操作未完成" role="alert" class="mb-4">
        {{ formError }} <NButton size="large" :disabled="busy || detailLoading || !online" @click="open(selectedId)">重新读取详情</NButton>
      </NAlert>
      <NAlert v-if="!online" type="warning" class="mb-4">当前离线，输入暂时保留，恢复后请重新读取。</NAlert>
      <FileDetail v-if="selected && !detailLoading" :file="selected" v-model:reason="reason" :busy="busy" :online="online"
        @download="startDownload" @remove="requestDelete" @close="close" />
      <div v-else>
        <p role="status">{{ detailLoading ? '正在读取文件详情…' : '详情未就绪，请重试。' }}</p>
        <NButton size="large" @click="close">关闭</NButton>
      </div>
      <NAlert v-if="notice" type="success" role="status" class="mt-4">{{ notice }}</NAlert>
    </NModal>
    <NModal :show="confirming" preset="dialog" title="确认删除文件"
      :content="`确认删除「${selected?.fileName ?? selected?.id ?? ''}」？操作将先撤销访问，再删除存储对象，无法撤销。`"
      positive-text="确认删除" negative-text="取消" :loading="busy" :mask-closable="!busy" :close-on-esc="!busy" :closable="false"
      :positive-button-props="{ size: 'large', type: 'error', disabled: busy || !online }" :negative-button-props="{ size: 'large', disabled: busy }"
      @positive-click="remove" @negative-click="confirming = false" @update:show="!busy && (confirming = false)" />
  </section>
</template>
