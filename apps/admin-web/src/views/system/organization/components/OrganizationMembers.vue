<script setup lang="ts">
  import { computed } from 'vue';
  import { NAlert, NButton, NDataTable, NForm, NFormItem, NInput, NInputNumber, NModal, NPagination, NSpace, NTabPane, NTabs } from 'naive-ui';
  import { useUiFeedback } from '../../../../components/ui/useUiFeedback';
  import { useUserStore } from '../../../../store/modules/user';
  import { useOrganizationMembers } from '../useOrganizationMembers';
  import { invitationColumns, memberActionLabels, memberColumns } from '../members.presentation';

  const state = useOrganizationMembers();
  const { organization, members, invitations, memberPage, invitePage, memberTotal, inviteTotal, loading, busy, ready, canManage,
    error, notice, userId, validDays, action, reason, confirming, online, load, open, close, invite, select, requestConfirm, commit } = state;
  useUiFeedback(notice);
  const user = useUserStore();
  const enabled = computed(() => ready.value && canManage.value && online.value && !busy.value && !loading.value);
  const memberTable = memberColumns(() => enabled.value, select, () => organization.value?.ownerUserId ?? '', () => user.info.id ?? '');
  const invitationTable = invitationColumns(() => enabled.value, select);
  function reload() { action.value = null; confirming.value = false; void load(); }
  defineExpose({ open });
</script>

<template>
  <NModal :show="!!organization" preset="card" :title="`${organization?.name ?? ''} · 成员管理`" :closable="false"
    :style="{ width: 'min(1100px, calc(100vw - 32px))' }" class="max-h-[calc(100dvh-32px)] overflow-y-auto"
    :mask-closable="!busy" :close-on-esc="!busy" @update:show="!$event && close()">
    <div class="space-y-4">
      <NAlert v-if="!online" type="warning">当前离线，数据可能已陈旧；恢复连接后请重新读取。</NAlert>
      <NAlert v-if="error" type="error" title="操作未完成，数据可能已陈旧" role="alert">
        {{ error }} <NButton size="large" :disabled="busy || loading || !online" @click="reload">重新读取</NButton>
      </NAlert>
      <p v-if="notice" role="status" class="rounded border border-admin-line bg-admin-surface p-4 text-admin-success">{{ notice }}</p>
      <NAlert v-if="ready && !canManage" type="info">当前为平台治理只读视图。邀请、入会审核和移除操作需要该组织的所有者或组织者权限。</NAlert>
      <NForm v-if="canManage" label-placement="top" @submit.prevent="invite">
        <div class="flex flex-wrap items-end gap-3">
          <NFormItem label="受邀用户 ID" class="min-w-0 flex-1 basis-64">
            <NInput v-model:value="userId" :disabled="!enabled" :maxlength="36" placeholder="输入已有用户的 UUID"
              :input-props="{ 'aria-label': '受邀用户 ID' }" size="large" />
          </NFormItem>
          <NFormItem label="有效期（天）" class="w-36">
            <NInputNumber v-model:value="validDays" :min="1" :max="30" :precision="0" :disabled="!enabled" aria-label="邀请有效天数" size="large" />
          </NFormItem>
          <NButton attr-type="submit" type="primary" size="large" class="mb-6" :loading="busy" :disabled="!enabled">邀请成员</NButton>
        </div>
        <p class="mt-0">邀请将在对方接受后生效，不授予任何组织角色。</p>
      </NForm>
      <NTabs type="line" animated>
        <NTabPane name="members" :tab="`成员与入会申请（${memberTotal}）`">
          <div class="min-w-0 overflow-x-auto">
            <NDataTable :columns="memberTable" :data="members" :row-key="row => row.id" :loading="loading" :scroll-x="960" />
          </div>
          <NPagination v-model:page="memberPage" class="mt-4" :item-count="memberTotal" :page-size="20" :page-slot="3" size="large"
            :disabled="busy || loading || !online" @update:page="reload" />
        </NTabPane>
        <NTabPane name="invitations" :tab="`定向邀请（${inviteTotal}）`">
          <div class="min-w-0 overflow-x-auto">
            <NDataTable :columns="invitationTable" :data="invitations" :row-key="row => row.id" :loading="loading" :scroll-x="870" />
          </div>
          <NPagination v-model:page="invitePage" class="mt-4" :item-count="inviteTotal" :page-size="20" :page-slot="3" size="large"
            :disabled="busy || loading || !online" @update:page="reload" />
        </NTabPane>
      </NTabs>
      <NForm v-if="action" label-placement="top" @submit.prevent="requestConfirm">
        <h3>{{ memberActionLabels[action.kind] }}：{{ action.name }}</h3>
        <p v-if="action.kind === 'remove'">成员关系将结束，当前组织及下属赛事、比赛角色将撤销；历史业务记录保留。</p>
        <NFormItem label="操作理由（不得含凭据或 URL）">
          <NInput v-model:value="reason" type="textarea" :maxlength="500" :disabled="busy" :input-props="{ 'aria-label': '成员操作理由' }" />
        </NFormItem>
        <NSpace>
          <NButton attr-type="submit" type="primary" size="large" :disabled="!enabled">继续确认</NButton>
          <NButton size="large" :disabled="busy" @click="action = null">取消操作</NButton>
        </NSpace>
      </NForm>
      <div class="flex flex-wrap justify-end gap-3">
        <NButton size="large" :disabled="busy || loading || !online" @click="reload">刷新成员数据</NButton>
        <NButton size="large" :disabled="busy" @click="close">关闭</NButton>
      </div>
    </div>
  </NModal>
  <NModal :show="confirming" preset="dialog" :closable="false" :title="action ? `确认${memberActionLabels[action.kind]}` : '确认操作'"
    :content="`${action?.name ?? ''}：${reason}`" positive-text="确认操作" negative-text="取消" :loading="busy"
    :mask-closable="!busy" :close-on-esc="!busy" :positive-button-props="{ size: 'large', disabled: !enabled }"
    :negative-button-props="{ size: 'large', disabled: busy }" @positive-click="commit" @negative-click="confirming = false"
    @update:show="!busy && (confirming = false)" />
</template>
