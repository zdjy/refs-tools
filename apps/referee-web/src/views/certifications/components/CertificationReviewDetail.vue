<script setup lang="ts">
import { computed } from 'vue'
import { NAlert, NButton } from 'naive-ui'
import type { Certification, CertificationAppeal, CertificationDecision, CertificationHistory } from '@refs-tools/contracts/certifications'
import CertificationAppealList from './CertificationAppealList.vue'
import CertificationDetailFields from './CertificationDetailFields.vue'
import CertificationEvidenceGroup from './CertificationEvidenceGroup.vue'
import CertificationHistoryList from './CertificationHistoryList.vue'
import CertificationStatusBadge from './CertificationStatusBadge.vue'
import {
  applicantTag, appealDecisionOptions, certificationStatusText, formatDateTime, pendingAppeal, reviewDecisionOptions,
} from '../certifications.presentation'

/**
 * 组织审核台详情。普通审核按状态给出合法决定；申诉复核只允许维持、改判批准或要求补件，
 * 原审核人与申请人本人会被禁用并说明原因，服务端仍会独立拒绝。
 */
const props = defineProps<{
  record: Certification; orgNames: Record<string, string>; historyItems: CertificationHistory[]; historyLoading: boolean
  historyError: string; appealItems: CertificationAppeal[]; appealsLoading: boolean; appealsError: string
  mode: 'review' | 'appeal'; currentUserId: string; busy: boolean; error: string; stale: string; canReadHistory?: boolean
}>()
const emit = defineEmits<{
  decide: [decision: CertificationDecision['decision']]; decideAppeal: [appeal: CertificationAppeal, decision: NonNullable<CertificationAppeal['decision']>]
  retryHistory: []; retryAppeals: []
}>()
const openAppeal = computed(() => pendingAppeal(props.appealItems))
const options = computed(() => props.mode === 'review' ? reviewDecisionOptions(props.record.status) : [])
const appealOptions = computed(() => appealDecisionOptions())
const selfReview = computed(() => props.record.subjectUserId === props.currentUserId)
// 申诉复核读取原始材料也走申诉证据入口，负责人没有普通认证材料读取权限。
const evidenceAppealId = computed(() => props.mode === 'appeal' ? openAppeal.value?.id : undefined)
const reviewerConflict = computed(() => !!openAppeal.value
  && (openAppeal.value.originalReviewerId === props.currentUserId || openAppeal.value.appellantId === props.currentUserId))
const closedAppeals = computed(() => props.appealItems.filter((item) => item.id !== openAppeal.value?.id))
function decideAppealOption(decision: NonNullable<CertificationAppeal['decision']>) {
  if (openAppeal.value) emit('decideAppeal', openAppeal.value, decision)
}
const conflictText = computed(() => openAppeal.value?.originalReviewerId === props.currentUserId
  ? '你是这条记录的原审核人，须回避本次申诉复核。请让另一位具备复核权限的负责人处理。'
  : '你是本次申诉的申请人，不能复核自己的申诉。')
</script>

<template>
  <section aria-labelledby="review-detail-title" class="grid gap-6 border-0 border-t border-solid border-ink pt-6">
    <header class="grid gap-3">
      <p class="m-0 text-[13px] font-semibold text-body">审核记录</p>
      <div class="flex flex-wrap items-center gap-3">
        <h2 id="review-detail-title" tabindex="-1" class="m-0 text-[24px] leading-tight font-bold tracking-[-.02em] text-ink focus:outline-hidden">{{ applicantTag(record.subjectUserId) }}</h2>
        <CertificationStatusBadge :status="record.status" />
        <CertificationStatusBadge v-if="record.effectiveStatus !== record.status" :status="record.effectiveStatus" :text="`效力：${certificationStatusText[record.effectiveStatus].label}`" />
      </div>
      <p class="m-0 max-w-[64ch] text-sm leading-relaxed text-body">{{ certificationStatusText[record.status].hint }}</p>
      <p class="m-0 font-mono text-[13px] text-body">版本 {{ record.version }} · 更新 {{ formatDateTime(record.updatedAt) }}</p>
      <n-alert v-if="error" type="error" :show-icon="false" role="alert">{{ error }}</n-alert>
      <p v-if="stale" role="status" class="m-0 border-0 border-l border-solid border-ink py-0.5 pl-3 text-[13px] leading-relaxed text-body">{{ stale }}</p>
    </header>
    <CertificationDetailFields :record="record" :org-names="orgNames" :appeal-id="evidenceAppealId" />

    <section v-if="mode === 'review'" aria-labelledby="decision-title" class="grid gap-3 border-0 border-t border-solid border-line pt-4">
      <h3 id="decision-title" class="m-0 text-sm font-semibold text-ink">审核决定</h3>
      <p v-if="selfReview" role="alert" class="m-0 rounded-xl border border-solid border-line bg-soft p-3 text-[13px] leading-relaxed text-danger">这是你本人的申请，不能审核自己的记录。请等待另一位认证员处理。</p>
      <p v-else-if="!options.length" class="m-0 text-sm leading-relaxed text-body">当前状态没有可执行的人工决定。若材料有误，请等待申诉流程。</p>
      <div v-else class="flex flex-wrap gap-2">
        <n-button v-for="option in options" :key="option.value" :type="option.value === 'approve' ? 'primary' : option.danger ? 'error' : 'default'"
          :secondary="option.value !== 'approve' && !option.danger" :disabled="busy" @click="emit('decide', option.value)">{{ option.label }}</n-button>
      </div>
      <p class="m-0 text-[13px] leading-relaxed text-body">决定会写入审计并生成新的历史版本；申请人不能自审，已提交申诉期间不能修改结论。</p>
    </section>

    <section v-if="mode === 'appeal'" aria-labelledby="appeal-review-title" class="grid gap-3 border-0 border-t border-solid border-line pt-4">
      <h3 id="appeal-review-title" class="m-0 text-sm font-semibold text-ink">申诉复核</h3>
      <template v-if="openAppeal">
        <p class="m-0 text-sm leading-[1.8] whitespace-pre-line text-ink wrap-anywhere">{{ openAppeal.reason }}</p>
        <p class="m-0 text-[13px] text-body">提交于 {{ formatDateTime(openAppeal.createdAt) }} · 申诉编号 {{ openAppeal.id.slice(0, 8) }}</p>
        <CertificationEvidenceGroup v-if="openAppeal.evidenceMediaIds.length" label="申诉补充材料" :ids="openAppeal.evidenceMediaIds"
          :certification-id="record.id" :appeal-id="openAppeal.id" />
        <p v-if="reviewerConflict" role="alert" class="m-0 rounded-xl border border-solid border-line bg-soft p-3 text-[13px] leading-relaxed text-danger">{{ conflictText }}</p>
        <div v-else class="flex flex-wrap gap-2">
          <n-button v-for="option in appealOptions" :key="option.value" :type="option.value === 'overturn' ? 'primary' : 'default'"
            :secondary="option.value !== 'overturn'" :disabled="busy" @click="decideAppealOption(option.value)">{{ option.label }}</n-button>
        </div>
        <p class="m-0 text-[13px] leading-relaxed text-body">复核结论会单独保存；改判批准仍要求申请人保持有效成员关系。</p>
      </template>
      <p v-else class="m-0 text-sm leading-relaxed text-body">这条记录当前没有待复核申诉，可能已由其他负责人处理。</p>
    </section>

    <div v-if="appealsLoading" role="status" class="m-0 text-[13px] text-body">正在读取申诉记录…</div>
    <div v-else-if="appealsError" class="grid gap-2">
      <p role="alert" class="m-0 text-[13px] text-danger">{{ appealsError }}</p>
      <div><n-button secondary size="small" @click="emit('retryAppeals')">重新读取申诉</n-button></div>
    </div>
    <CertificationAppealList v-else :items="closedAppeals" :certification-id="record.id" />
    <CertificationHistoryList v-if="canReadHistory !== false" :items="historyItems" :loading="historyLoading" :error="historyError" @retry="emit('retryHistory')" />
  </section>
</template>
