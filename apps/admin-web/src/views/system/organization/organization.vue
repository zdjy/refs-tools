<script setup lang="ts">
  import { ref } from 'vue';
  import { NAlert, NButton, NCard, NDataTable, NForm, NFormItem, NInput, NModal, NPagination, NSelect, NSpace, NSpin } from 'naive-ui';
  import { useUiFeedback } from '../../../components/ui/useUiFeedback';
  import { useOrganizations } from './useOrganizations';
  import { actionDescriptions, actionLabels, actionTypes, organizationColumns, statusOptions } from './organizations.presentation';
  import OrganizationCreateForm from './components/OrganizationCreateForm.vue';
  import OrganizationDetail from './components/OrganizationDetail.vue';
  import OrganizationMembers from './components/OrganizationMembers.vue';

  const { items, total, page, keyword, status, selected, selectedId, loading, detailLoading, ready, busy, error, formError,
    notice, online, mode, action, reason, confirming, form, load, create, open, close, requestDecision, save, decide } = useOrganizations();
  useUiFeedback(notice);
  const memberPanel = ref<InstanceType<typeof OrganizationMembers> | null>(null);
  const columns = organizationColumns(open, organization => memberPanel.value?.open(organization));
  function updateForm(value: typeof form) { Object.assign(form, value); }
</script>

<template>
  <section class="min-w-0 space-y-4" aria-label="组织管理">
    <NCard title="组织管理" :bordered="false">
      <p class="m-0">审核组织申请，管理运营状态。组织通过审核后，负责人才能开展组织业务。</p>
    </NCard>
    <NAlert v-if="!online" type="warning" title="当前离线">暂不能读取或提交，数据可能已陈旧。恢复连接后请刷新。</NAlert>
    <p v-if="notice" role="status" class="rounded border border-admin-line bg-admin-surface p-4 text-admin-success">{{ notice }}</p>
    <NCard :bordered="false">
      <NForm inline size="large" @submit.prevent="load(1)">
        <div class="flex w-full flex-wrap items-end gap-3">
          <NFormItem label="组织名称 / 地区" class="w-full min-w-0 sm:w-auto sm:flex-1">
            <NInput v-model:value="keyword" :maxlength="100" clearable :input-props="{ 'aria-label': '组织名称或地区' }" placeholder="搜索组织" />
          </NFormItem>
          <NFormItem label="组织状态" class="w-40">
            <NSelect v-model:value="status" :options="statusOptions" clearable aria-label="筛选组织状态" placeholder="全部状态" />
          </NFormItem>
          <NSpace class="mb-6">
            <NButton attr-type="submit" size="large" :disabled="loading || !online">查询</NButton>
            <NButton size="large" :disabled="loading || !online" @click="keyword = ''; status = null; load(1)">重置</NButton>
            <NButton type="primary" size="large" :disabled="busy || !online" @click="create">代录组织申请</NButton>
          </NSpace>
        </div>
      </NForm>
      <NAlert v-if="error" type="error" title="读取失败，列表可能已陈旧" class="mb-4" role="alert">
        {{ error }} <NButton size="large" :disabled="loading || !online" @click="load()">重试</NButton>
      </NAlert>
      <div class="min-w-0 overflow-x-auto">
        <NDataTable :columns="columns" :data="items" :loading="loading" :row-key="row => row.id" :scroll-x="1290" />
      </div>
      <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span>共 {{ total }} 个组织</span>
        <NPagination :page="page" :item-count="total" :page-size="20" :page-slot="3" size="large"
          :disabled="loading || !online" @update:page="load" />
      </div>
    </NCard>
    <OrganizationMembers ref="memberPanel" />
    <NModal :show="!!mode" preset="card" :title="mode === 'create' ? '代录组织申请' : '组织详情与治理'"
      class="max-h-[calc(100dvh-32px)] overflow-y-auto"
      :style="{ width: 'min(680px, calc(100vw - 32px))' }" :mask-closable="!busy" :close-on-esc="!busy" :closable="false"
      @update:show="!$event && close()">
      <NAlert v-if="formError" type="error" class="mb-4" title="操作未完成" role="alert">
        {{ formError }}
        <NButton v-if="mode === 'detail'" size="large" :disabled="detailLoading || busy || !online" @click="open(selectedId)">重新读取</NButton>
      </NAlert>
      <NAlert v-if="!online" type="warning" class="mb-4">当前离线，无法提交；输入暂时保留。</NAlert>
      <p v-if="notice" role="status" class="mb-4 rounded border border-admin-line bg-admin-surface p-4 text-admin-success">{{ notice }}</p>
      <NAlert v-if="error" type="warning" role="alert" class="mb-4">
        操作结果以详情为准，列表刷新失败：{{ error }}
        <NButton size="large" :disabled="busy || loading || !online" @click="load()">重试刷新列表</NButton>
      </NAlert>
      <OrganizationCreateForm v-if="mode === 'create'" :form="form" :busy="busy" :online="online"
        @update:form="updateForm" @save="save" @close="close" />
      <NSpin v-else :show="detailLoading">
        <OrganizationDetail v-if="selected && ready" :organization="selected" v-model:action="action" v-model:reason="reason"
          :busy="busy" :online="online" @request="requestDecision" @close="close" />
        <div v-else>
          <p role="status">{{ detailLoading ? '正在读取组织详情…' : '详情未就绪，请重新读取。' }}</p>
          <NButton size="large" @click="close">关闭</NButton>
        </div>
      </NSpin>
    </NModal>
    <NModal :show="confirming" preset="dialog" :title="action ? `确认${actionLabels[action]}` : '确认操作'"
      :content="`${selected?.name ?? ''}：${action ? actionDescriptions[action] : ''}`" positive-text="确认操作" negative-text="取消"
      :loading="busy" :mask-closable="!busy" :close-on-esc="!busy" :closable="false"
      :positive-button-props="{ size: 'large', disabled: !online || busy, type: action ? actionTypes[action] : 'primary' }"
      :negative-button-props="{ size: 'large', disabled: busy }" @negative-click="confirming = false"
      @update:show="!busy && (confirming = false)" @positive-click="decide" />
  </section>
</template>
