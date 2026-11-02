<script setup lang="ts">
import type { AuditSummary } from '@refs-tools/contracts/audit'
import { actionLabel, formatTime, resourceLabels, scopeLabels } from '../audit.presentation'
defineProps<{ items: readonly AuditSummary[] }>()
</script>

<template>
  <div class="grid gap-4">
    <article v-for="item in items" :key="item.id" class="min-w-0 rounded-2xl border border-solid border-line bg-surface p-5">
      <header class="mb-4 flex flex-wrap items-start justify-between gap-3">
        <h3 class="m-0 text-base font-semibold">{{ actionLabel(item.action) }}</h3>
        <time :datetime="item.createdAt" class="text-xs text-body">{{ formatTime(item.createdAt) }}</time>
      </header>
      <dl class="m-0 grid gap-4 text-sm compact:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr]">
        <div class="min-w-0"><dt class="text-xs text-body">操作者 ID</dt><dd class="m-0 mt-1 break-all">{{ item.actorUserId }}</dd></div>
        <div class="min-w-0"><dt class="text-xs text-body">资源 · {{ resourceLabels[item.resourceType] ?? item.resourceType }}</dt><dd class="m-0 mt-1 break-all">{{ item.resourceId }}</dd></div>
        <div class="min-w-0"><dt class="text-xs text-body">作用域 · {{ scopeLabels[item.scopeType] ?? item.scopeType }}</dt><dd class="m-0 mt-1 break-all">{{ item.scopeId ?? '平台范围（无独立 ID）' }}</dd></div>
      </dl>
      <p v-if="item.reason" class="mb-0 mt-4 whitespace-pre-wrap break-words rounded-xl bg-soft p-3 text-sm leading-relaxed text-body"><strong>操作理由：</strong>{{ item.reason }}</p>
    </article>
  </div>
</template>
