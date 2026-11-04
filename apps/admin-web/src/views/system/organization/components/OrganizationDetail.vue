<script setup lang="ts">
  import { NAlert, NButton, NFormItem, NInput, NSpace } from 'naive-ui';
  import type { OrganizationDecision, OrganizationDetail } from '@refs-tools/contracts/organizations';
  import { actionDescriptions, actionLabels, actionOptions, statusLabels } from '../organizations.presentation';

  defineProps<{ organization: OrganizationDetail; action: OrganizationDecision['action'] | null; reason: string; busy: boolean; online: boolean }>();
  const emit = defineEmits<{ 'update:action': [value: OrganizationDecision['action'] | null]; 'update:reason': [value: string]; request: []; close: [] }>();
</script>

<template>
  <dl class="m-0 grid grid-cols-1 gap-3 break-words sm:grid-cols-2">
    <div><dt>组织名称</dt><dd class="m-0">{{ organization.name }}</dd></div>
    <div><dt>当前状态</dt><dd class="m-0">{{ statusLabels[organization.status] }}（版本 {{ organization.version }}）</dd></div>
    <div><dt>地区</dt><dd class="m-0">{{ organization.region || '未填写' }}</dd></div>
    <div><dt>组织 ID</dt><dd class="m-0 break-all">{{ organization.id }}</dd></div>
    <div class="sm:col-span-2"><dt>组织用途</dt><dd class="m-0 whitespace-pre-wrap">{{ organization.purpose || '未填写' }}</dd></div>
    <div><dt>负责人实名</dt><dd class="m-0">{{ organization.ownerLegalName || '未填写' }}</dd></div>
    <div><dt>联系方式</dt><dd class="m-0">{{ organization.contact || '未填写' }}</dd></div>
    <div class="sm:col-span-2"><dt>负责人用户 ID</dt><dd class="m-0 break-all">{{ organization.ownerUserId }}</dd></div>
    <div><dt>创建时间</dt><dd class="m-0">{{ new Date(organization.createdAt).toLocaleString() }}</dd></div>
    <div><dt>审核时间</dt><dd class="m-0">{{ organization.reviewedAt ? new Date(organization.reviewedAt).toLocaleString() : '尚未审核' }}</dd></div>
    <div v-if="organization.reviewedBy" class="sm:col-span-2"><dt>审核人用户 ID</dt><dd class="m-0 break-all">{{ organization.reviewedBy }}</dd></div>
    <div v-if="organization.governanceReason" class="sm:col-span-2"><dt>最近治理理由</dt><dd class="m-0 whitespace-pre-wrap">{{ organization.governanceReason }}</dd></div>
  </dl>
  <div v-if="actionOptions[organization.status].length" class="mt-6">
    <NFormItem label="治理操作">
      <NSpace>
        <NButton v-for="option in actionOptions[organization.status]" :key="option.value" size="large"
          :type="action === option.value ? 'primary' : 'default'" :aria-pressed="action === option.value" :disabled="busy"
          @click="emit('update:action', option.value)">{{ option.label }}</NButton>
      </NSpace>
    </NFormItem>
    <template v-if="action">
      <NAlert type="warning" class="mb-4">{{ actionDescriptions[action] }}</NAlert>
      <NFormItem label="操作理由（必填）">
        <NInput :value="reason" type="textarea" :maxlength="500" show-count :disabled="busy" size="large"
          :input-props="{ 'aria-label': '操作理由' }" placeholder="说明本次决定的依据，请勿填写密码、凭据或 URL"
          @update:value="emit('update:reason', $event)" />
      </NFormItem>
    </template>
  </div>
  <NSpace justify="end" class="mt-4">
    <NButton size="large" :disabled="busy" @click="emit('close')">关闭</NButton>
    <NButton v-if="action" size="large" :type="action === 'freeze' || action === 'reject' ? 'error' : 'primary'"
      :disabled="busy || !online" @click="emit('request')">{{ actionLabels[action] }}</NButton>
  </NSpace>
</template>
