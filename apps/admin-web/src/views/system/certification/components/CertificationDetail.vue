<script setup lang="ts">
import { computed } from 'vue';
import { NButton, NCollapse, NCollapseItem } from 'naive-ui';
import type { Certification, CertificationAppeal, CertificationAppealDecision, CertificationDecision, CertificationHistory, CertificationReviewSummary } from '@refs-tools/contracts/certifications';
import { decisionLabels, decisionOptions, levelLabels, statusLabels } from '../certifications.presentation';
import CertificationEvidence from './CertificationEvidence.vue';
const props = defineProps<{ record: Certification; applicant: CertificationReviewSummary['applicant']; appeals: CertificationAppeal[];
  history: CertificationHistory[]; mode: 'review' | 'records' | 'appeal'; currentUserId: string; busy: boolean }>();
defineEmits<{ decide: [decision: CertificationDecision['decision'] | CertificationAppealDecision['decision']] }>();
const pending = computed(() => props.appeals.find(item => item.status === 'pending'));
const conflict = computed(() => props.record.subjectUserId === props.currentUserId || (props.mode === 'appeal' && pending.value?.originalReviewerId === props.currentUserId));
const options = computed(() => props.mode === 'appeal' ? pending.value ? ['uphold', 'overturn', 'needs_more_information'] as const : [] : pending.value ? [] : decisionOptions(props.record.status));
const evidenceAppealId = computed(() => props.mode === 'appeal' ? (pending.value ?? props.appeals[0])?.id : undefined);
</script>
<template>
  <article class="min-w-0 space-y-5">
    <header class="space-y-2 border-b border-admin-line pb-4">
      <h2 tabindex="-1" class="m-0 break-words text-xl font-semibold">{{ applicant.legalName || '未填写实名' }} · {{ applicant.nickname }}</h2>
      <p class="m-0 break-all text-sm text-admin-body">账号 {{ record.subjectUserId }} · 版本 {{ record.version }}</p>
      <p class="m-0 font-semibold">{{ statusLabels[record.status] }}<template v-if="record.effectiveStatus !== record.status"> · 当前效力：{{ statusLabels[record.effectiveStatus] }}</template></p>
      <p v-if="record.reviewNote" class="m-0 whitespace-pre-line text-base leading-relaxed">原决定理由：{{ record.reviewNote }}</p>
    </header>
    <section v-if="mode === 'appeal' && pending" class="space-y-3 border-b border-admin-line pb-4">
      <h3 class="m-0 text-base font-semibold">申诉理由与补充材料</h3>
      <p class="m-0 break-words whitespace-pre-line">{{ pending.reason }}</p>
      <CertificationEvidence :record-id="record.id" :ids="pending.evidenceMediaIds" label="申诉材料" :appeal-id="pending.id" />
    </section>
    <dl class="m-0 grid gap-4 sm:grid-cols-2">
      <div><dt class="text-sm text-admin-body">认证级别</dt><dd class="m-0">{{ levelLabels[record.level] }}</dd></div>
      <div><dt class="text-sm text-admin-body">证书编号</dt><dd class="m-0 break-all font-mono">{{ record.certificateNumber }}</dd></div>
      <div><dt class="text-sm text-admin-body">发证机构</dt><dd class="m-0 break-words">{{ record.issuer }}</dd></div>
      <div><dt class="text-sm text-admin-body">取得日期</dt><dd class="m-0">{{ record.obtainedAt || '未填写' }}</dd></div>
    </dl>
    <p class="m-0 break-words whitespace-pre-line leading-relaxed">{{ record.statement }}</p>
    <CertificationEvidence :record-id="record.id" :ids="record.evidenceMediaIds" label="证书原件" :appeal-id="evidenceAppealId" />
    <CertificationEvidence :record-id="record.id" :ids="record.historyMediaIds" label="履历材料" :appeal-id="evidenceAppealId" />
    <section class="space-y-3 border-t border-admin-line pt-4">
      <h3 class="m-0 text-base font-semibold">{{ mode === 'appeal' ? '申诉复核决定' : '审核决定' }}</h3>
      <p v-if="conflict" role="alert" class="text-admin-error">你是申请人或原审核人，必须回避本次处理。</p>
      <div v-else class="flex flex-wrap gap-2">
        <NButton v-for="option in options" :key="option" size="large" :disabled="busy" :type="option === 'approve' || option === 'overturn' ? 'primary' : option === 'revoke' ? 'error' : 'default'" @click="$emit('decide', option)">{{ decisionLabels[option] }}</NButton>
        <p v-if="!options.length" class="m-0 text-admin-body">当前没有可执行决定。待处理申诉须先独立复核。</p>
      </div>
      <p class="m-0 text-sm text-admin-body">核对证书、履历与声明后填写具体理由；决定将保留历史并记录审计。</p>
    </section>
    <NCollapse>
      <NCollapseItem title="办理历史" name="history">
        <ul class="m-0 space-y-3 pl-5"><li v-for="item in history" :key="item.record.version">版本 {{ item.record.version }} · {{ statusLabels[item.record.status] }} · {{ new Date(item.createdAt).toLocaleString('zh-CN') }}<p v-if="item.record.reviewNote" class="m-0 break-words">{{ item.record.reviewNote }}</p></li></ul>
      </NCollapseItem>
      <NCollapseItem title="申诉记录" name="appeals">
        <ul class="m-0 space-y-3 pl-5"><li v-for="item in appeals" :key="item.id"><p class="m-0 break-words">{{ item.reason }}</p><p class="m-0">{{ item.status === 'pending' ? '待复核' : item.decision ? decisionLabels[item.decision] : '已处理' }} · {{ item.reviewReason }}</p></li></ul>
      </NCollapseItem>
    </NCollapse>
  </article>
</template>

<style scoped>
/* 决定按钮使用公开根元素补齐键盘轮廓，不覆盖组件内部状态。 */
button:focus-visible { outline: 2px solid var(--admin-primary); outline-offset: 2px; }
</style>
