<script setup lang="ts">
import { ChevronRight } from '@lucide/vue'
import type { CertificationSummary } from '@refs-tools/contracts/certifications'
import {
  certificationStatusText, formatDateTime, qualificationLevelLabels, scopeName,
} from '../certifications.presentation'
import CertificationStatusBadge from './CertificationStatusBadge.vue'

/** 本人当前认证的平铺列表：范围、级别、人工结论与当前效力分两行呈现。 */
defineProps<{ items: CertificationSummary[]; orgNames: Record<string, string>; selectedId: string | null }>()
defineEmits<{ select: [item: CertificationSummary] }>()
</script>

<template>
  <ul class="m-0 grid list-none gap-0 border-0 border-t border-solid border-ink p-0">
    <li v-for="item in items" :key="item.id">
      <button type="button" :aria-current="selectedId === item.id ? 'true' : undefined"
        class="grid min-h-[72px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-0 border-b border-solid border-line px-1 py-4 text-left transition-colors duration-200 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[.995]"
        :class="selectedId === item.id ? 'bg-surface' : 'bg-transparent'"
        @click="$emit('select', item)">
        <span class="grid min-w-0 gap-1.5">
          <span class="flex flex-wrap items-center gap-2">
            <span class="text-[17px] font-semibold text-ink wrap-anywhere">{{ scopeName(item.scope, orgNames) }}</span>
            <CertificationStatusBadge :status="item.status" />
            <CertificationStatusBadge v-if="item.effectiveStatus !== item.status" :status="item.effectiveStatus" :text="`效力：${certificationStatusText[item.effectiveStatus].label}`" />
          </span>
          <span class="text-[13px] leading-relaxed text-body">{{ qualificationLevelLabels[item.level] }} · 更新 {{ formatDateTime(item.updatedAt) }}</span>
        </span>
        <ChevronRight class="size-5 shrink-0 text-body" :stroke-width="1.75" aria-hidden="true" />
      </button>
    </li>
  </ul>
</template>
