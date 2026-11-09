<script setup lang="ts">
import type { CertificationAppeal } from '@refs-tools/contracts/certifications'
import { appealDecisionLabels, formatDateTime } from '../certifications.presentation'
import CertificationEvidenceGroup from './CertificationEvidenceGroup.vue'

/** 申诉与认证效力独立：待复核不改变原结论，已复核显示处理方式与说明。 */
defineProps<{ items: CertificationAppeal[]; certificationId: string }>()
</script>

<template>
  <section v-if="items.length" aria-labelledby="appeal-list-title" class="grid gap-3 border-0 border-t border-solid border-line pt-4">
    <h3 id="appeal-list-title" class="m-0 text-sm font-semibold text-ink">申诉记录</h3>
    <ul class="m-0 grid list-none gap-3 p-0">
      <li v-for="item in items" :key="item.id" class="grid gap-2 rounded-xl border border-solid border-line bg-surface p-4">
        <p class="m-0 flex flex-wrap items-center gap-2">
          <span class="inline-flex min-h-7 items-center rounded-full px-2.5 text-[12px] font-semibold" :class="item.status === 'pending' ? 'bg-sand text-ink' : 'bg-soft text-body'">
            {{ item.status === 'pending' ? '等待独立复核' : '已复核' }}
          </span>
          <span class="text-[13px] text-body">{{ formatDateTime(item.createdAt) }}</span>
        </p>
        <p class="m-0 text-sm leading-[1.8] whitespace-pre-line text-ink wrap-anywhere">{{ item.reason }}</p>
        <p v-if="item.decision" class="m-0 text-sm leading-relaxed text-ink">
          复核结论：{{ appealDecisionLabels[item.decision] }}<template v-if="item.decidedAt">（{{ formatDateTime(item.decidedAt) }}）</template>
        </p>
        <p v-if="item.reviewReason" class="m-0 max-w-[70ch] text-sm leading-[1.8] whitespace-pre-line text-body wrap-anywhere">{{ item.reviewReason }}</p>
        <CertificationEvidenceGroup v-if="item.evidenceMediaIds.length" label="申诉补充材料" :ids="item.evidenceMediaIds"
          :certification-id="certificationId" :appeal-id="item.id" />
      </li>
    </ul>
  </section>
</template>
