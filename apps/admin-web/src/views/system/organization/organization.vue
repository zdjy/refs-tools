<script setup lang="ts">
  import { ref } from 'vue';
  import { NButton, NInput, NSelect } from 'naive-ui';
  import { useUiFeedback } from '../../../components/ui/useUiFeedback';
  import { useOrganizations } from './useOrganizations';
  import { actionDescriptions, actionLabels, actionTypes, statusOptions, organizationColumns } from './organizations.presentation';
  import OrganizationCreateForm from './components/OrganizationCreateForm.vue';
  import OrganizationDetail from './components/OrganizationDetail.vue';
  import OrganizationMembers from './components/OrganizationMembers.vue';
  import OwnershipTransfer from './components/OwnershipTransfer.vue';
  import PlatformInvites from './components/PlatformInvites.vue';
  import AdminPage from '@/components/admin-shell/AdminPage.vue';
  import AdminFilterBar from '@/components/admin-shell/AdminFilterBar.vue';
  import AdminField from '@/components/admin-shell/AdminField.vue';
  import AdminDataTable from '@/components/admin-shell/AdminDataTable.vue';
  import AdminPagination from '@/components/admin-shell/AdminPagination.vue';
  import AdminStateBanner from '@/components/admin-shell/AdminStateBanner.vue';
  import AdminDialogShell from '@/components/admin-shell/AdminDialogShell.vue';
  import AdminConfirmButton from '@/components/admin-shell/AdminConfirmButton.vue';

  const {
    items, total, page, keyword, status, selected, selectedId, loading, detailLoading, ready, busy, error, formError,
    notice, online, mode, action, reason, form, profile, profileDirty, profileEditable, savingProfile,
    load, create, open, close, requestDecision, resetProfile, save, saveProfile, decide, fetchForTransfer,
  } = useOrganizations();

  useUiFeedback(notice);

  const memberPanel = ref<InstanceType<typeof OrganizationMembers> | null>(null);
  const transferPanel = ref<InstanceType<typeof OwnershipTransfer> | null>(null);
  const invitePanel = ref<InstanceType<typeof PlatformInvites> | null>(null);
  const createForm = ref<InstanceType<typeof OrganizationCreateForm> | null>(null);

  async function startTransfer(organization: { id: string }) {
    const detail = await fetchForTransfer(organization.id);
    if (detail) await transferPanel.value?.open(detail);
  }

  const columns = organizationColumns(
    open,
    (organization) => void memberPanel.value?.open(organization),
    startTransfer
  );

  function updateForm(value: typeof form) {
    Object.assign(form, value);
  }

  function updateProfile(value: typeof profile) {
    Object.assign(profile, value);
  }

  function reset() {
    keyword.value = '';
    status.value = null;
    void load(1);
  }

  const countLabel = (value: number) => `共 ${value} 个组织`;
  const decisionMessage = () =>
    `${selected.value?.name ?? ''}：${action.value ? actionDescriptions[action.value] : ''}`;
</script>

<template>
  <section class="page" aria-label="组织管理">
    <AdminPage title="组织管理" description="审核组织申请，管理运营状态。组织通过审核后，负责人才能开展组织业务。">
      <template #actions>
        <NButton :disabled="busy || !online" @click="invitePanel?.show()">平台邀请码</NButton>
        <NButton type="primary" :disabled="busy || !online" @click="create">代录组织申请</NButton>
      </template>
    </AdminPage>

    <AdminStateBanner
      v-if="!online"
      tone="warning"
      message="当前离线，暂不能读取或提交，数据可能已陈旧。恢复连接后请刷新。"
    />
    <AdminStateBanner v-if="error" tone="danger" :message="error" action="重试" @action="load()" />

    <AdminFilterBar>
      <AdminField label="组织名称 / 地区" grow>
        <template #default="{ id }">
          <NInput
            :id="id"
            v-model:value="keyword"
            :maxlength="100"
            clearable
            placeholder="搜索组织"
            @keyup.enter="load(1)"
          />
        </template>
      </AdminField>
      <AdminField label="组织状态" fixed="148px">
        <template #default="{ id }">
          <NSelect :id="id" v-model:value="status" :options="statusOptions" clearable placeholder="全部状态" />
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
      empty-text="没有匹配的组织"
      empty-hint="调整筛选条件，或通过邀请码创建新组织。"
      @retry="load()"
      @row-click="(row) => open(row.id)"
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

    <OrganizationMembers ref="memberPanel" />
    <OwnershipTransfer ref="transferPanel" @done="load()" />
    <PlatformInvites ref="invitePanel" />

    <AdminDialogShell
      :show="!!mode"
      :title="mode === 'create' ? '代录组织申请' : '组织详情与治理'"
      :size="mode === 'create' ? 'md' : 'lg'"
      :busy="busy"
      @update:show="!$event && close()"
    >
      <AdminStateBanner
        v-if="formError"
        tone="danger"
        :message="formError"
        :action="mode === 'detail' ? '重新读取' : undefined"
        @action="open(selectedId)"
      />
      <AdminStateBanner v-if="!online" tone="warning" message="当前离线，无法提交；输入暂时保留。" />
      <AdminStateBanner
        v-if="error"
        tone="warning"
        :message="`操作结果以详情为准，列表刷新失败：${error}`"
        action="重试刷新列表"
        @action="load()"
      />

      <OrganizationCreateForm
        v-if="mode === 'create'"
        ref="createForm"
        :form="form"
        :busy="busy"
        :online="online"
        @update:form="updateForm"
        @submit="save"
      />
      <OrganizationDetail
        v-else-if="selected && ready"
        :organization="selected"
        :action="action"
        :reason="reason"
        :busy="busy"
        :profile="profile"
        :profile-editable="profileEditable"
        @update:profile="updateProfile"
        @update:action="action = $event"
        @update:reason="reason = $event"
      />
      <p v-else role="status" class="detail-pending">
        {{ detailLoading ? '正在读取组织详情…' : '详情未就绪，请重新读取。' }}
      </p>

      <template #footer>
        <template v-if="mode === 'create'">
          <NButton :disabled="busy" @click="close">取消</NButton>
          <NButton type="primary" :loading="busy" :disabled="busy || !online" @click="createForm?.submit()">
            录入申请
          </NButton>
        </template>
        <template v-else>
          <AdminConfirmButton
            v-if="action"
            class="footer-danger"
            :label="actionLabels[action]"
            :message="decisionMessage()"
            :confirm-label="`确认${actionLabels[action]}`"
            :tone="actionTypes[action] === 'error' ? 'danger' : 'primary'"
            :disabled="busy || !online || !ready || !reason.trim()"
            @update:open="(value: boolean) => value && requestDecision()"
            @confirm="decide"
          />
          <NButton v-if="profileEditable && profileDirty" :disabled="busy" @click="resetProfile">撤销修改</NButton>
          <NButton :disabled="busy" @click="close">关闭</NButton>
          <NButton
            v-if="profileEditable"
            type="primary"
            :loading="savingProfile"
            :disabled="busy || !online || !profileDirty"
            @click="saveProfile"
          >
            保存资料
          </NButton>
        </template>
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

  .detail-pending {
    font-size: var(--admin-text-body-size);
    line-height: var(--admin-text-body-leading);
    color: var(--admin-body);
  }

  .footer-danger {
    margin-right: auto;
  }
</style>
