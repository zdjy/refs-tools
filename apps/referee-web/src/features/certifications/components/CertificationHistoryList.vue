<script setup lang="ts">
import { NButton } from 'naive-ui'
import type { CertificationHistory } from '@refs-tools/contracts/certifications'
import { certificationStatusText, formatDateTime } from '../certifications.presentation'

/** 历史使用当前记录快照，表示写入当时的材料与版本，不代表当前效力。 */
defineProps<{ items: CertificationHistory[]; loading: boolean; error: string }>()
defineEmits<{ retry: [] }>()
const actionLabels: Record<string, string> = {
  created: '创建草稿', 'certification.changed': '保存材料或提交', 'certification.decided': '审核结论',
  'certification.revoked': '撤销认证', 'certification.appealed': '提交申诉',
}
</script>

<template>
  <details class="group border-0 border-t border-solid border-line">
    <summary class="flex min-h-11 cursor-pointer items-center justify-between gap-3 py-2 text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
      <span>办理历史</span><span class="font-mono text-[13px] font-normal text-body">{{ items.length }}</span>
    </summary>
    <div class="grid gap-3 pb-3">
      <p v-if="loading" role="status" class="m-0 text-[13px] text-body">正在读取历史…</p>
      <div v-else-if="error" class="grid gap-2">
        <p role="alert" class="m-0 text-[13px] leading-relaxed text-danger">{{ error }}</p>
        <div><n-button secondary size="small" @click="$emit('retry')">重新读取历史</n-button></div>
      </div>
      <p v-else-if="!items.length" class="m-0 text-[13px] leading-relaxed text-body">暂无历史记录。</p>
      <ol v-else class="m-0 grid list-none gap-0 p-0">
        <li v-for="item in items" :key="`${item.record.id}-${item.createdAt}`" class="grid gap-1 border-0 border-b border-solid border-line py-3 last:border-b-0">
          <p class="m-0 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-ink">
            <span class="font-semibold">{{ actionLabels[item.action] ?? item.action }}</span>
            <span class="text-[13px] text-body">{{ certificationStatusText[item.record.status].label }} · 版本 {{ item.record.version }}</span>
          </p>
          <p class="m-0 text-[13px] text-body">{{ formatDateTime(item.createdAt) }} · 操作人 {{ item.actorUserId.slice(0, 8) }}</p>
        </li>
      </ol>
    </div>
  </details>
</template>
