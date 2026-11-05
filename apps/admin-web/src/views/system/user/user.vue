<script setup lang="ts">
  import { computed } from 'vue';
  import { NAlert, NButton, NCard, NDataTable, NForm, NFormItem, NInput, NModal, NPagination, NSelect, NSpace } from 'naive-ui';
  import { useUserStore } from '@/store/modules/user';
  import { useUiFeedback } from '../../../components/ui/useUiFeedback';
  import UiLoadingHint from '../../../components/ui/UiLoadingHint.vue';
  import { useUsers } from './useUsers';
  import { statusOptions, userColumns } from './users.presentation';
  import UserDialog from './components/UserDialog.vue';

  const actor = useUserStore();
  const { items, total, page, keyword, status, loading, busy, detailLoading, detailReady, error, formError, notice, online,
    selected, mode, confirm, form, load, create, open, close, save, remove } = useUsers();
  useUiFeedback(notice);
  const columns = computed(() => userColumns(open, actor.info.id));
  function updateForm(value: typeof form) { Object.assign(form, value); }
</script>

<template>
  <section class="min-w-0 space-y-4" aria-label="用户管理">
    <NCard title="用户管理" :bordered="false">
      <p class="mb-0 mt-0">管理账号资料、登录状态与账号生命周期，查看当前平台角色。</p>
    </NCard>
    <NAlert v-if="!online" type="warning" title="当前离线">暂不能读取或提交，页面数据可能已陈旧。恢复连接后请刷新。</NAlert>
    <p v-if="notice" role="status" class="rounded border border-admin-line bg-admin-surface p-4 text-admin-success">{{ notice }}</p>
    <NCard :bordered="false">
      <NForm inline size="large" @submit.prevent="load(1)">
        <div class="flex w-full flex-wrap items-end gap-3">
          <NFormItem label="邮箱 / 显示名称" :show-feedback="false" class="w-full min-w-0 sm:min-w-[280px] sm:max-w-[420px] sm:flex-1">
            <NInput v-model:value="keyword" :maxlength="100" clearable :input-props="{ 'aria-label': '邮箱或显示名称' }" placeholder="搜索用户" />
          </NFormItem>
          <NFormItem label="账号状态" :show-feedback="false" class="w-full sm:w-40">
            <NSelect v-model:value="status" :options="statusOptions" clearable aria-label="筛选账号状态" placeholder="全部状态" />
          </NFormItem>
          <NSpace>
            <NButton attr-type="submit" size="large" :disabled="loading || !online">查询</NButton>
            <NButton size="large" :disabled="loading || !online" @click="keyword = ''; status = null; load(1)">重置</NButton>
          </NSpace>
          <NButton type="primary" size="large" class="sm:ml-auto" :disabled="busy || !online" @click="create">新增用户</NButton>
        </div>
      </NForm>
      <NAlert v-if="error" type="error" title="读取失败，列表可能已陈旧" class="mb-4" role="alert">
        {{ error }} <NButton size="large" :disabled="loading || !online" @click="load()">重试</NButton>
      </NAlert>
      <UiLoadingHint :loading="loading" label="读取用户列表" @retry="load()" />
      <div class="min-w-0 overflow-x-auto">
        <NDataTable :columns="columns" :data="items" :loading="loading" :row-key="row => row.id" :scroll-x="1190" />
      </div>
      <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span>共 {{ total }} 位用户</span>
        <NPagination :page="page" :item-count="total" :page-size="20" :page-slot="3" size="large"
          :disabled="loading || !online" @update:page="load" />
      </div>
    </NCard>
    <UserDialog v-if="mode" :mode="mode" :selected="selected" :form="form" :loading="detailLoading" :busy="busy"
      :ready="detailReady" :online="online" :error="formError" :actor-id="actor.info.id"
      @update:form="updateForm" @close="close" @save="save()" @remove="confirm = 'delete'"
      @retry="selected && open(selected, mode === 'edit' ? 'edit' : 'detail')" />
    <NModal :show="!!confirm" preset="dialog" :title="confirm === 'delete' ? '确认删除用户' : '确认停用用户'"
      :content="confirm === 'delete' ? `删除 ${selected?.email} 后将撤销全部会话，邮箱不释放，历史记录保留。` : '停用后该用户将无法登录，全部现有会话立即失效。'"
      positive-text="确认操作" negative-text="取消" :loading="busy" :mask-closable="!busy" :close-on-esc="!busy"
      :closable="!busy" :positive-button-props="{ size: 'large', disabled: !online || busy, type: 'error' }"
      :negative-button-props="{ size: 'large', disabled: busy }" @negative-click="confirm = null"
      @update:show="!busy && (confirm = null)" @positive-click="confirm === 'delete' ? remove() : save(true)" />
  </section>
</template>
