<script setup lang="ts">
  import { computed } from 'vue';
  import { NAlert, NButton, NDataTable, NForm, NFormItem, NInputNumber, NModal, NPagination } from 'naive-ui';
  import { useUiFeedback } from '../../../../components/ui/useUiFeedback';
  import { usePlatformInvites } from '../usePlatformInvites';
  import { inviteColumns } from '../platform-invites.presentation';
  import PlatformInviteReveal from './PlatformInviteReveal.vue';

  const state = usePlatformInvites();
  const { items, total, page, open, loading, busy, ready, error, notice, staleNote, validDays, token, revoking, online, copyNotice,
    load, show, close, dismissToken, copyToken, create, requestRevoke, cancelRevoke, revoke } = state;
  useUiFeedback(notice);
  const enabled = computed(() => ready.value && online.value && !busy.value && !loading.value);
  const columns = inviteColumns(() => enabled.value, requestRevoke);
  defineExpose({ show });
</script>

<template>
  <NModal :show="open" preset="card" title="平台组织邀请码" :closable="false" :style="{ width: 'min(960px, calc(100vw - 32px))' }"
    class="max-h-[calc(100dvh-32px)] overflow-y-auto" :mask-closable="!busy" :close-on-esc="!busy" @update:show="!$event && close()">
    <div class="space-y-4">
      <p class="m-0">邀请码一次性、短期有效。持码的已验证用户提交组织申请时可直接创建为正常运营，免平台审核；它与组织成员邀请码完全分离，不能互相使用。</p>
      <NAlert v-if="!online" type="warning">当前离线，无法生成或撤销；数据可能已陈旧。</NAlert>
      <NAlert v-if="error" type="error" title="操作未完成" role="alert">
        {{ error }} <NButton size="large" :disabled="busy || loading || !online" @click="load()">重新读取</NButton>
      </NAlert>
      <NAlert v-if="staleNote" type="warning" role="alert">
        写入已成功，但{{ staleNote }}。请只重新读取，不要重复操作。
        <NButton size="large" :disabled="busy || loading || !online" @click="load()">重试读取</NButton>
      </NAlert>
      <PlatformInviteReveal v-if="token" :token="token" :notice="copyNotice" @copy="copyToken" @dismiss="dismissToken" />
      <NForm label-placement="top" @submit.prevent="create">
        <div class="flex flex-wrap items-end gap-3">
          <NFormItem label="有效期（天，1–7）" class="w-44">
            <NInputNumber v-model:value="validDays" :min="1" :max="7" :precision="0" :disabled="!enabled" size="large" aria-label="邀请码有效天数" />
          </NFormItem>
          <NButton attr-type="submit" type="primary" size="large" class="mb-6" :loading="busy" :disabled="!enabled">生成邀请码</NButton>
        </div>
      </NForm>
      <div class="min-w-0 overflow-x-auto">
        <NDataTable :columns="columns" :data="items" :row-key="row => row.id" :loading="loading" :scroll-x="1000" />
      </div>
      <NPagination v-model:page="page" :item-count="total" :page-size="20" :page-slot="3" size="large"
        :disabled="busy || loading || !online" @update:page="load" />
      <div class="flex justify-end"><NButton size="large" :disabled="busy" @click="close">关闭</NButton></div>
    </div>
  </NModal>
  <NModal :show="!!revoking" preset="dialog" :closable="false" title="确认撤销邀请码"
    :content="`撤销以「${revoking?.hint ?? ''}」结尾的邀请码后立即失效，已创建的组织不受影响。`" positive-text="确认撤销" negative-text="取消"
    :loading="busy" :mask-closable="!busy" :close-on-esc="!busy" :positive-button-props="{ size: 'large', type: 'error', disabled: !enabled }"
    :negative-button-props="{ size: 'large', disabled: busy }" @positive-click="revoke" @negative-click="cancelRevoke"
    @update:show="!busy && cancelRevoke()" />
</template>
