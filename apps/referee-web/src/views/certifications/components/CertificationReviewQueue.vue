<script setup lang="ts">
import { ChevronRight } from '@lucide/vue'
import type { CertificationSummary } from '@refs-tools/contracts/certifications'
import { applicantTag, certificationStatusText, formatDateTime, qualificationLevelLabels } from '../certifications.presentation'
import CertificationStatusBadge from './CertificationStatusBadge.vue'

/** 审核队列只显示摘要与账号尾号，完整材料在选中后单独授权读取。 */
defineProps<{ items: CertificationSummary[]; selectedId: string | null; mode: 'review' | 'appeal' }>()
defineEmits<{ select: [item: CertificationSummary] }>()
</script>

<template>
  <ul v-if="items.length" class="m-0 grid list-none gap-0 border-0 border-t border-solid border-ink p-0">
    <li v-for="item in items" :key="item.id">
      <button type="button" :aria-current="selectedId === item.id ? 'true' : undefined"
        class="grid min-h-[72px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-0 border-b border-solid border-line px-1 py-4 text-left transition-colors duration-200 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[.995]"
        :class="selectedId === item.id ? 'bg-surface' : 'bg-transparent'" @click="$emit('select', item)">
        <span class="grid min-w-0 gap-1.5">
          <span class="flex flex-wrap items-center gap-2">
            <span class="text-[17px] font-semibold text-ink">{{ applicantTag(item.subjectUserId) }}</span>
            <span class="text-[13px] text-body">{{ qualificationLevelLabels[item.level] }}</span>
            <CertificationStatusBadge :status="item.status" />
            <CertificationStatusBadge v-if="item.effectiveStatus !== item.status" :status="item.effectiveStatus" :text="`效力：${certificationStatusText[item.effectiveStatus].label}`" />
            <span v-if="mode === 'appeal'" class="inline-flex min-h-7 items-center rounded-full bg-sand px-2.5 text-[12px] font-semibold text-ink">待复核</span>
          </span>
          <span class="text-[13px] leading-relaxed text-body">更新 {{ formatDateTime(item.updatedAt) }} · 版本 {{ item.version }}</span>
        </span>
        <ChevronRight class="size-5 shrink-0 text-body" :stroke-width="1.75" aria-hidden="true" />
      </button>
    </li>
  </ul>
  <p v-else class="m-0 border-0 border-t border-solid border-line pt-5 text-sm leading-relaxed text-body">
    {{ mode === 'review' ? '当前没有待审核的认证。新的提交会出现在这里。' : '当前没有待复核的申诉。' }}
  </p>
</template>
