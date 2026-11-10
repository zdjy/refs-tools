<script setup lang="ts">
  /**
   * 平台直接移交所有权：表单在弹窗主体，确认动作在页脚就地完成。
   */
  import { computed } from 'vue';
  import { NButton, NForm, NFormItem, NInput, NSelect } from 'naive-ui';
  import type { OrganizationDetail } from '@refs-tools/contracts/organizations';
  import { useUiFeedback } from '../../../../components/ui/useUiFeedback';
  import { useOwnershipTransfer } from '../useOwnershipTransfer';
  import AdminDialogShell from '@/components/admin-shell/AdminDialogShell.vue';
  import AdminStateBanner from '@/components/admin-shell/AdminStateBanner.vue';
  import AdminConfirmButton from '@/components/admin-shell/AdminConfirmButton.vue';
  import AdminPagination from '@/components/admin-shell/AdminPagination.vue';

  const emit = defineEmits<{ done: [] }>();
  const state = useOwnershipTransfer(undefined, undefined, () => emit('done'));
  const {
    organization, candidates, keyword, page, total, selectedId, reason, loading, busy, error, notice, online,
    load, open, close, search, requestConfirm, commit,
  } = state;
  useUiFeedback(notice);

  const options = computed(() =>
    candidates.value.map((item) => ({
      value: item.userId,
      label: `${item.displayName}（尾号 ${item.userId.slice(-4)}）`,
    }))
  );
  const enabled = computed(() => !!organization.value && !loading.value && online.value && !busy.value);
  const chosen = computed(() => candidates.value.find((item) => item.userId === selectedId.value)?.displayName ?? '');
  const ready = computed(() => !!selectedId.value && !!reason.value.trim());

  function reopen() {
    if (organization.value) void load();
  }

  defineExpose({ open: (value: OrganizationDetail) => open(value) });
</script>

<template>
  <AdminDialogShell
    :show="!!organization"
    :title="`${organization?.name ?? ''} · 移交所有权`"
    size="md"
    :busy="busy"
    @update:show="!$event && close()"
  >
    <div class="transfer">
      <AdminStateBanner
        tone="warning"
        message="平台直接移交无需新负责人确认。原负责人将失去该组织的全部管理角色，仅保留正式成员身份；尚未处理的负责人移交请求会被取代。"
      />
      <AdminStateBanner v-if="!online" tone="warning" message="当前离线，无法提交；输入暂时保留。" />
      <AdminStateBanner v-if="error" tone="danger" :message="error" action="重新读取成员" @action="reopen" />
      <AdminStateBanner v-if="notice" tone="success" :message="notice" />

      <NForm label-placement="top" @submit.prevent="requestConfirm">
        <NFormItem label="新负责人（须为本组织正式成员）">
          <NSelect
            :value="selectedId || null"
            :options="options"
            :loading="loading"
            :disabled="!enabled"
            filterable
            remote
            clearable
            placeholder="按昵称搜索成员"
            :input-props="{ 'aria-label': '新负责人', maxlength: 100 }"
            @search="search"
            @update:value="selectedId = $event ?? ''"
          >
            <template #empty>
              {{ loading ? '正在读取成员…' : '没有可选的正式成员，请先让对方加入本组织' }}
            </template>
          </NSelect>
        </NFormItem>
        <div v-if="total > 20" class="transfer-page">
          <span class="hint">共 {{ total }} 位成员，当前关键词「{{ keyword }}」</span>
          <AdminPagination
            :page="page"
            :total="total"
            :count-label="(value: number) => `共 ${value} 位成员`"
            :disabled="!enabled"
            @update:page="load"
          />
        </div>
        <NFormItem label="操作理由（必填，不得含凭据或 URL）">
          <NInput
            v-model:value="reason"
            type="textarea"
            :maxlength="500"
            show-count
            :autosize="{ minRows: 3, maxRows: 5 }"
            :disabled="!enabled"
            :input-props="{ 'aria-label': '移交理由' }"
            placeholder="说明移交的依据，如原负责人失联或申请变更"
          />
        </NFormItem>
      </NForm>
    </div>

    <template #footer>
      <NButton :disabled="busy" @click="close">取消</NButton>
      <AdminConfirmButton
        tone="danger"
        label="移交所有权"
        :message="`将「${organization?.name ?? ''}」的所有权移交给 ${chosen}。原负责人立即失去管理权限。`"
        confirm-label="确认移交"
        :loading="busy"
        :disabled="!enabled || !ready"
        @update:open="(value: boolean) => value && requestConfirm()"
        @confirm="commit"
      />
    </template>
  </AdminDialogShell>
</template>

<style scoped>
  .transfer {
    display: flex;
    flex-direction: column;
    gap: var(--admin-space-md);
    min-width: 0;
  }

  .transfer-page {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--admin-space-md);
    margin-bottom: var(--admin-space-lg);
  }

  .hint {
    font-size: var(--admin-text-meta-size);
    line-height: var(--admin-text-meta-leading);
    color: var(--admin-muted);
  }
</style>
