<script setup lang="ts">
  import { NAlert, NButton, NDescriptions, NDescriptionsItem, NFormItem, NInput, NSpace } from 'naive-ui';
  import type { AdminMedia } from '@refs-tools/contracts/admin-media';
  import { formatBytes, formatTime, purposeLabel, retained, statusLabel } from '../files.presentation';
  defineProps<{ file: AdminMedia; reason: string; busy: boolean; online: boolean }>();
  defineEmits<{ 'update:reason': [value: string]; download: []; remove: []; close: [] }>();
</script>

<template>
  <div class="space-y-4">
    <NDescriptions :column="1" bordered size="small" label-placement="left" :label-style="{ width: '108px' }">
      <NDescriptionsItem label="文件名"><span class="break-all">{{ file.fileName ?? '未命名文件' }}</span></NDescriptionsItem>
      <NDescriptionsItem label="文件 ID"><span class="break-all">{{ file.id }}</span></NDescriptionsItem>
      <NDescriptionsItem label="所属用户 ID"><span class="break-all">{{ file.ownerUserId }}</span></NDescriptionsItem>
      <NDescriptionsItem label="用途 / 状态">{{ purposeLabel(file.purpose) }} / {{ statusLabel(file.status) }}</NDescriptionsItem>
      <NDescriptionsItem label="关联目标"><span class="break-all">{{ file.target.type }} / {{ file.target.id ?? '平台' }}</span></NDescriptionsItem>
      <NDescriptionsItem label="类型">{{ file.contentType }}</NDescriptionsItem>
      <NDescriptionsItem label="声明大小">{{ formatBytes(file.expectedSizeBytes) }}（{{ file.expectedSizeBytes }} 字节）</NDescriptionsItem>
      <NDescriptionsItem label="核验大小">{{ formatBytes(file.verifiedSizeBytes) }}<span v-if="file.verifiedSizeBytes !== null">（{{ file.verifiedSizeBytes }} 字节）</span></NDescriptionsItem>
      <NDescriptionsItem label="创建 / 上传意图到期">{{ formatTime(file.createdAt) }} / {{ formatTime(file.expiresAt) }}</NDescriptionsItem>
      <NDescriptionsItem label="核验 / 逻辑删除">{{ formatTime(file.verifiedAt) }} / {{ formatTime(file.deletedAt) }}</NDescriptionsItem>
      <NDescriptionsItem label="维护清理记录">{{ formatTime(file.cleanedAt) }}（无记录不表示对象仍存在）</NDescriptionsItem>
    </NDescriptions>
    <NAlert v-if="retained(file)" type="warning">已核验的证据须按所属业务审批留存，不能在此通用删除。</NAlert>
    <NAlert v-if="file.status === 'deleted'" type="info">文件访问已撤销。若上次对象删除失败，可填写理由后重试删除。</NAlert>
    <NFormItem label="下载 / 删除理由" required>
      <NInput :value="reason" type="textarea" :maxlength="500" show-count :disabled="busy" :input-props="{ 'aria-label': '文件操作理由' }"
        placeholder="说明本次管理操作的必要性，请勿填写凭据或 URL" @update:value="$emit('update:reason', $event)" />
    </NFormItem>
    <p class="text-admin-body">下载链接仅短时有效，文件由浏览器直接从对象存储下载，不进行在线预览。下载内容可能含私有资料，请妥善保管。</p>
    <NSpace>
      <NButton type="primary" size="large" :loading="busy" :disabled="busy || !online || file.status !== 'available'" @click="$emit('download')">授权下载</NButton>
      <NButton type="error" size="large" :disabled="busy || !online || retained(file)" @click="$emit('remove')">{{ file.status === 'deleted' ? '重试对象删除' : '删除文件' }}</NButton>
      <NButton size="large" :disabled="busy" @click="$emit('close')">关闭</NButton>
    </NSpace>
  </div>
</template>
