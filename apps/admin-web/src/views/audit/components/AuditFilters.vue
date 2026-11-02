<script setup lang="ts">
import { nextTick } from 'vue'
import { NButton, NInput } from 'naive-ui'
import type { AuditQuery } from '@refs-tools/contracts/audit'
import { resourceLabels, scopeLabels } from '../audit.presentation'

defineProps<{ loading: boolean; fieldError: string }>()
const scopeType = defineModel<NonNullable<AuditQuery['scopeType']> | ''>('scopeType', { required: true })
const resourceType = defineModel<NonNullable<AuditQuery['resourceType']> | ''>('resourceType', { required: true })
const resourceId = defineModel<string>('resourceId', { required: true })
const emit = defineEmits<{ search: []; reset: [] }>()
async function submit() {
  emit('search')
  await nextTick()
  const input = document.getElementById('audit-resource-id')
  if (input?.getAttribute('aria-invalid') === 'true') input.focus()
}
const selectClass = 'h-12 w-full min-w-0 rounded-xl border border-solid border-line bg-soft px-3 text-sm text-ink'
</script>

<template>
  <form novalidate class="rounded-2xl border border-solid border-line bg-surface p-5" @submit.prevent="submit">
    <div class="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_2fr]">
      <div>
        <label for="audit-scope" class="mb-2 block text-sm font-semibold">作用域</label>
        <select id="audit-scope" v-model="scopeType" :class="selectClass" :disabled="loading">
          <option value="">全部作用域</option><option v-for="(label, value) in scopeLabels" :key="value" :value="value">{{ label }}</option>
        </select>
      </div>
      <div>
        <label for="audit-resource-type" class="mb-2 block text-sm font-semibold">资源类型</label>
        <select id="audit-resource-type" v-model="resourceType" :class="selectClass" :disabled="loading">
          <option value="">全部资源</option><option v-for="(label, value) in resourceLabels" :key="value" :value="value">{{ label }}</option>
        </select>
      </div>
      <div class="md:col-span-2 xl:col-span-1">
        <label for="audit-resource-id" class="mb-2 block text-sm font-semibold">资源 ID <span class="font-normal text-body">（可选）</span></label>
        <NInput v-model:value="resourceId" placeholder="输入完整 UUID" :disabled="loading" :input-props="{ id: 'audit-resource-id', 'aria-invalid': !!fieldError, 'aria-describedby': fieldError ? 'resource-id-error' : undefined }" />
        <p v-if="fieldError" id="resource-id-error" class="mb-0 mt-2 text-sm text-red-hover">{{ fieldError }}</p>
      </div>
    </div>
    <div class="mt-4 flex flex-wrap items-center gap-3">
      <NButton type="primary" attr-type="submit" :loading="loading" :disabled="loading">查询记录</NButton>
      <NButton :disabled="loading" @click="emit('reset')">重置筛选</NButton>
      <span class="text-xs leading-relaxed text-body">每次查询均会产生审计记录，不自动刷新。</span>
    </div>
  </form>
</template>
