<script setup lang="ts">
import type { Certification } from '@refs-tools/contracts/certifications'
import { formatDate, formatDateTime, qualificationLevelLabels, scopeName } from '../certifications.presentation'
import CertificationEvidenceGroup from './CertificationEvidenceGroup.vue'

/** 申请材料只读投影：详情页与组织审核台共用，避免两处字段或顺序不一致。 */
const props = defineProps<{ record: Certification; orgNames?: Record<string, string>; appealId?: string | undefined; showReview?: boolean }>()
</script>

<template>
  <div class="grid gap-6">
    <dl class="m-0 grid gap-x-8 gap-y-4 xs:grid-cols-2 compact:grid-cols-3">
      <div class="grid gap-1"><dt class="text-[13px] text-body">认证范围</dt><dd class="m-0 text-sm font-medium text-ink wrap-anywhere">{{ scopeName(props.record.scope, props.orgNames ?? {}) }}</dd></div>
      <div class="grid gap-1"><dt class="text-[13px] text-body">级别</dt><dd class="m-0 text-sm font-medium text-ink">{{ qualificationLevelLabels[props.record.level] }}</dd></div>
      <div class="grid gap-1"><dt class="text-[13px] text-body">取得日期</dt><dd class="m-0 text-sm font-medium text-ink">{{ props.record.obtainedAt ? formatDate(props.record.obtainedAt) : '未填写' }}</dd></div>
      <div class="grid gap-1"><dt class="text-[13px] text-body">证书编号</dt><dd class="m-0 font-mono text-sm text-ink wrap-anywhere">{{ props.record.certificateNumber }}</dd></div>
      <div class="grid gap-1"><dt class="text-[13px] text-body">发证机构</dt><dd class="m-0 text-sm font-medium text-ink wrap-anywhere">{{ props.record.issuer }}</dd></div>
      <div class="grid gap-1"><dt class="text-[13px] text-body">最近更新</dt><dd class="m-0 text-sm font-medium text-ink">{{ formatDateTime(props.record.updatedAt) }}</dd></div>
    </dl>
    <section aria-labelledby="statement-title" class="grid gap-2 border-0 border-l border-solid border-line pl-4">
      <h3 id="statement-title" class="m-0 text-[13px] font-semibold text-body">个人声明</h3>
      <p class="m-0 max-w-[70ch] text-sm leading-[1.8] whitespace-pre-line text-ink wrap-anywhere">{{ props.record.statement }}</p>
    </section>
    <div class="grid gap-5 compact:grid-cols-2">
      <CertificationEvidenceGroup label="证书原件" :ids="props.record.evidenceMediaIds" :certification-id="props.record.id" :appeal-id="props.appealId" />
      <CertificationEvidenceGroup label="履历材料" :ids="props.record.historyMediaIds" :certification-id="props.record.id" :appeal-id="props.appealId" />
    </div>
    <section v-if="showReview !== false && (props.record.reviewNote || props.record.reviewedAt)" aria-labelledby="review-note-title" class="grid gap-2 border-0 border-t border-solid border-line pt-4">
      <h3 id="review-note-title" class="m-0 text-[13px] font-semibold text-body">审核信息</h3>
      <p class="m-0 text-sm leading-relaxed text-ink">
        <template v-if="props.record.reviewedAt">审核时间：{{ formatDateTime(props.record.reviewedAt) }}。</template>
        <template v-else>尚未产生人工审核结论。</template>
      </p>
      <p v-if="props.record.reviewNote" class="m-0 max-w-[70ch] text-sm leading-[1.8] whitespace-pre-line text-ink wrap-anywhere">{{ props.record.reviewNote }}</p>
    </section>
  </div>
</template>
