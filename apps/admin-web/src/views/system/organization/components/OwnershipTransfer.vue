<script setup lang="ts">
  import { computed } from 'vue';
  import { NAlert, NButton, NForm, NFormItem, NInput, NModal, NPagination, NSelect } from 'naive-ui';
  import type { OrganizationDetail } from '@refs-tools/contracts/organizations';
  import { useUiFeedback } from '../../../../components/ui/useUiFeedback';
  import { useOwnershipTransfer } from '../useOwnershipTransfer';

  const emit = defineEmits<{ done: [] }>();
  const state = useOwnershipTransfer(undefined, undefined, () => emit('done'));
  const { organization, candidates, keyword, page, total, selectedId, reason, loading, busy, confirming, error, notice, online,
    load, open, close, search, requestConfirm, commit } = state;
  useUiFeedback(notice);
  const options = computed(() => candidates.value.map(item => ({ value: item.userId, label: `${item.displayName}（尾号 ${item.userId.slice(-4)}）` })));
  const enabled = computed(() => !!organization.value && !loading.value && online.value && !busy.value);
  const chosen = computed(() => candidates.value.find(item => item.userId === selectedId.value)?.displayName ?? '');
  function reopen() { if (organization.value) void load(); }
  defineExpose({ open: (value: OrganizationDetail) => open(value) });
</script>

<template>
  <NModal :show="!!organization" preset="card" :title="`${organization?.name ?? ''} · 移交所有权`" :closable="false"
    :style="{ width: 'min(640px, calc(100vw - 32px))' }" class="max-h-[calc(100dvh-32px)] overflow-y-auto"
    :mask-closable="!busy" :close-on-esc="!busy" @update:show="!$event && close()">
    <NForm label-placement="top" size="large" @submit.prevent="requestConfirm">
      <NAlert type="warning" class="mb-4">
        平台直接移交无需新负责人确认。原负责人将失去该组织的全部管理角色，仅保留正式成员身份；新负责人获得所有者与组织者角色。
        尚未处理的负责人移交请求会被取代。
      </NAlert>
      <NAlert v-if="!online" type="warning" class="mb-4">当前离线，无法提交；输入暂时保留。</NAlert>
      <NAlert v-if="error" type="error" class="mb-4" title="操作未完成" role="alert">
        {{ error }} <NButton size="large" :disabled="busy || loading || !online" @click="reopen">重新读取成员</NButton>
      </NAlert>
      <NFormItem label="新负责人（须为本组织正式成员）">
        <NSelect :value="selectedId || null" :options="options" :loading="loading" :disabled="!enabled" filterable remote clearable
          size="large" menu-size="large" placeholder="按昵称搜索成员" :input-props="{ 'aria-label': '新负责人', maxlength: 100 }"
          @search="search" @update:value="selectedId = $event ?? ''">
          <template #empty>{{ loading ? '正在读取成员…' : '没有可选的正式成员，请先让对方加入本组织' }}</template>
        </NSelect>
      </NFormItem>
      <div v-if="total > 20" class="mb-4 flex flex-wrap items-center gap-2">
        <span class="text-sm">共 {{ total }} 位成员，当前关键词「{{ keyword }}」</span>
        <NPagination :page="page" :item-count="total" :page-size="20" :page-slot="3" size="large" :disabled="!enabled" @update:page="load" />
      </div>
      <NFormItem label="操作理由（必填，不得含凭据或 URL）">
        <NInput v-model:value="reason" type="textarea" :maxlength="500" show-count :disabled="!enabled" size="large"
          :input-props="{ 'aria-label': '移交理由' }" placeholder="说明移交的依据，如原负责人失联或申请变更" />
      </NFormItem>
      <div class="flex flex-wrap justify-end gap-3">
        <NButton size="large" :disabled="busy" @click="close">取消</NButton>
        <NButton attr-type="submit" type="primary" size="large" :disabled="!enabled">继续确认</NButton>
      </div>
    </NForm>
  </NModal>
  <NModal :show="confirming" preset="dialog" :closable="false" title="确认移交所有权"
    :content="`将「${organization?.name ?? ''}」的所有权移交给 ${chosen}。原负责人立即失去管理权限。`" positive-text="确认移交" negative-text="取消"
    :loading="busy" :mask-closable="!busy" :close-on-esc="!busy" :positive-button-props="{ size: 'large', type: 'error', disabled: !enabled }"
    :negative-button-props="{ size: 'large', disabled: busy }" @positive-click="commit" @negative-click="confirming = false"
    @update:show="!busy && (confirming = false)" />
</template>
