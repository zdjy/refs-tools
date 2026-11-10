<script setup lang="ts">
  import { computed } from 'vue';
  import { NButton, NInput, NSelect } from 'naive-ui';
  import { useUserStore } from '@/store/modules/user';
  import { useUiFeedback } from '../../../components/ui/useUiFeedback';
  import { useUsers } from './useUsers';
  import { statusOptions, userColumns } from './users.presentation';
  import UserDialog from './components/UserDialog.vue';
  import AdminPage from '@/components/admin-shell/AdminPage.vue';
  import AdminFilterBar from '@/components/admin-shell/AdminFilterBar.vue';
  import AdminField from '@/components/admin-shell/AdminField.vue';
  import AdminDataTable from '@/components/admin-shell/AdminDataTable.vue';
  import AdminPagination from '@/components/admin-shell/AdminPagination.vue';
  import AdminStateBanner from '@/components/admin-shell/AdminStateBanner.vue';
  import { useCompactViewport } from '@/components/admin-shell/useCompactViewport';

  const actor = useUserStore();
  const compact = useCompactViewport();
  const {
    items,
    total,
    page,
    keyword,
    status,
    loading,
    busy,
    detailLoading,
    detailReady,
    error,
    formError,
    actionError,
    notice,
    online,
    selected,
    mode,
    form,
    load,
    create,
    open,
    close,
    save,
    remove,
  } = useUsers();

  useUiFeedback(notice);

  const columns = computed(() =>
    userColumns({ open, remove, actorId: actor.info.id, compact: compact.value, busy: busy.value })
  );

  function updateForm(value: typeof form) {
    Object.assign(form, value);
  }

  function reset() {
    keyword.value = '';
    status.value = null;
    void load(1);
  }

  const countLabel = (value: number) => `共 ${value} 位用户`;
</script>

<template>
  <section class="page" aria-label="用户管理">
    <AdminPage title="用户管理" description="管理账号资料、登录状态与账号生命周期，查看当前平台角色。">
      <template #actions>
        <NButton type="primary" :disabled="busy || !online" @click="create">新增用户</NButton>
      </template>
    </AdminPage>

    <AdminStateBanner
      v-if="!online"
      tone="warning"
      message="当前离线，暂不能读取或提交，页面数据可能已陈旧。恢复连接后请刷新。"
    />
    <AdminStateBanner v-if="error" tone="danger" :message="error" action="重试" @action="load()" />
    <AdminStateBanner
      v-if="actionError"
      tone="danger"
      :message="`删除未完成：${actionError}`"
      action="重试刷新列表"
      @action="load()"
    />

    <AdminFilterBar>
      <AdminField label="邮箱 / 显示名称" grow>
        <template #default="{ id }">
          <NInput
            :id="id"
            v-model:value="keyword"
            :maxlength="100"
            clearable
            placeholder="搜索用户"
            @keyup.enter="load(1)"
          />
        </template>
      </AdminField>
      <AdminField label="账号状态" fixed="148px">
        <template #default="{ id }">
          <NSelect
            :id="id"
            v-model:value="status"
            :options="statusOptions"
            clearable
            placeholder="全部状态"
          />
        </template>
      </AdminField>
      <template #actions>
        <NButton quaternary :disabled="loading || !online" @click="reset">重置</NButton>
        <NButton type="primary" :disabled="loading || !online" @click="load(1)">查询</NButton>
      </template>
    </AdminFilterBar>

    <AdminDataTable
      :columns="columns"
      :data="items"
      :loading="loading"
      :row-key="(row) => row.id"
      empty-text="没有匹配的用户"
      empty-hint="调整筛选条件，或新增一位用户。"
      @retry="load()"
      @row-click="(row) => open(row, 'detail')"
    >
      <template #footer>
        <AdminPagination
          :page="page"
          :total="total"
          :count-label="countLabel"
          :disabled="loading || !online"
          @update:page="load"
        />
      </template>
    </AdminDataTable>

    <UserDialog
      v-if="mode"
      :mode="mode"
      :selected="selected"
      :form="form"
      :loading="detailLoading"
      :busy="busy"
      :ready="detailReady"
      :online="online"
      :error="formError"
      @update:form="updateForm"
      @close="close"
      @save="save"
      @retry="selected && open(selected, mode === 'edit' ? 'edit' : 'detail')"
    />
  </section>
</template>

<style scoped>
  .page {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
</style>
