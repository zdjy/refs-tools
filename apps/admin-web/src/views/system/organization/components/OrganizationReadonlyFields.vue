<script setup lang="ts">
  import { NFormItem, NInput } from 'naive-ui';
  import type { OrganizationDetail } from '@refs-tools/contracts/organizations';
  import { statusLabels } from '../organizations.presentation';

  defineProps<{ organization: OrganizationDetail }>();
  const time = (value: string | null) => value ? new Date(value).toLocaleString() : '未记录';
</script>

<template>
  <!-- 只读字段同样用表单控件承载：禁用状态明确表达「平台不可改写」，并保留可复制的原值。 -->
  <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
    <NFormItem label="当前状态">
      <NInput :value="`${statusLabels[organization.status]}（版本 ${organization.version}）`" disabled aria-label="当前状态" />
    </NFormItem>
    <NFormItem label="组织 ID">
      <NInput :value="organization.id" disabled aria-label="组织 ID" />
    </NFormItem>
    <NFormItem label="负责人实名">
      <NInput :value="organization.ownerLegalName || '未填写'" disabled aria-label="负责人实名" />
    </NFormItem>
    <NFormItem label="负责人用户 ID">
      <NInput :value="organization.ownerUserId" disabled aria-label="负责人用户 ID" />
    </NFormItem>
    <NFormItem label="创建时间">
      <NInput :value="time(organization.createdAt)" disabled aria-label="创建时间" />
    </NFormItem>
    <NFormItem label="审核时间">
      <NInput :value="time(organization.reviewedAt)" disabled aria-label="审核时间" />
    </NFormItem>
    <NFormItem v-if="organization.reviewedBy" label="审核人用户 ID" class="sm:col-span-2">
      <NInput :value="organization.reviewedBy" disabled aria-label="审核人用户 ID" />
    </NFormItem>
    <NFormItem v-if="organization.governanceReason" label="最近治理理由" class="sm:col-span-2">
      <NInput :value="organization.governanceReason" type="textarea" :autosize="{ minRows: 2, maxRows: 5 }" disabled
        aria-label="最近治理理由" />
    </NFormItem>
  </div>
</template>
