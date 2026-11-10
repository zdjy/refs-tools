<script setup lang="ts">
  /**
   * 认证记录详情：申请人、材料、声明、决定入口与历史。
   * 只负责呈现；决定弹窗由页面持有（FS-0010 v2 §5.2）。
   */
  import { computed } from 'vue';
  import { NButton } from 'naive-ui';
  import type {
    Certification,
    CertificationAppeal,
    CertificationAppealDecision,
    CertificationDecision,
    CertificationHistory,
    CertificationReviewSummary,
  } from '@refs-tools/contracts/certifications';
  import { decisionLabels, decisionOptions, levelLabels, statusLabels, statusTones } from '../certifications.presentation';
  import AdminBadge from '@/components/admin-shell/AdminBadge.vue';
  import CertificationEvidence from './CertificationEvidence.vue';
  import CertificationHistoryList from './CertificationHistoryList.vue';

  const props = defineProps<{
    record: Certification;
    applicant: CertificationReviewSummary['applicant'];
    appeals: CertificationAppeal[];
    history: CertificationHistory[];
    mode: 'review' | 'records' | 'appeal';
    currentUserId: string;
    busy: boolean;
  }>();
  defineEmits<{ decide: [decision: CertificationDecision['decision'] | CertificationAppealDecision['decision']] }>();

  const pending = computed(() => props.appeals.find((item) => item.status === 'pending'));
  const conflict = computed(
    () =>
      props.record.subjectUserId === props.currentUserId ||
      (props.mode === 'appeal' && pending.value?.originalReviewerId === props.currentUserId)
  );
  const options = computed(() =>
    props.mode === 'appeal'
      ? pending.value
        ? (['uphold', 'overturn', 'needs_more_information'] as const)
        : []
      : pending.value
        ? []
        : decisionOptions(props.record.status)
  );
  const evidenceAppealId = computed(() =>
    props.mode === 'appeal' ? (pending.value ?? props.appeals[0])?.id : undefined
  );
  const fields = computed(() => [
    { label: '认证级别', value: levelLabels[props.record.level] },
    { label: '证书编号', value: props.record.certificateNumber, mono: true },
    { label: '发证机构', value: props.record.issuer },
    { label: '取得日期', value: props.record.obtainedAt || '未填写' },
  ]);
  const decisionType = (option: string) =>
    option === 'approve' || option === 'overturn' ? 'primary' : option === 'revoke' ? 'error' : 'default';
</script>

<template>
  <article class="record">
    <header class="record-head">
      <h2 tabindex="-1" class="record-title">{{ applicant.legalName || '未填写实名' }} · {{ applicant.nickname }}</h2>
      <p class="record-meta">账号 {{ record.subjectUserId }} · 版本 {{ record.version }}</p>
      <p class="record-status">
        <AdminBadge v-bind="statusTones[record.status]">{{ statusLabels[record.status] }}</AdminBadge>
        <template v-if="record.effectiveStatus !== record.status">
          当前效力：<AdminBadge v-bind="statusTones[record.effectiveStatus]">{{ statusLabels[record.effectiveStatus] }}</AdminBadge>
        </template>
      </p>
      <p v-if="record.reviewNote" class="record-note">原决定理由：{{ record.reviewNote }}</p>
    </header>

    <section v-if="mode === 'appeal' && pending" class="record-section" aria-labelledby="appeal-reason-title">
      <h3 id="appeal-reason-title" class="record-heading">申诉理由与补充材料</h3>
      <p class="record-text">{{ pending.reason }}</p>
      <CertificationEvidence :record-id="record.id" :ids="pending.evidenceMediaIds" label="申诉材料" :appeal-id="pending.id" />
    </section>

    <dl class="record-grid">
      <div v-for="field in fields" :key="field.label" class="record-field">
        <dt>{{ field.label }}</dt>
        <dd :class="{ 'is-mono': field.mono }">{{ field.value }}</dd>
      </div>
    </dl>

    <p class="record-text">{{ record.statement }}</p>
    <CertificationEvidence :record-id="record.id" :ids="record.evidenceMediaIds" label="证书原件" :appeal-id="evidenceAppealId" />
    <CertificationEvidence :record-id="record.id" :ids="record.historyMediaIds" label="履历材料" :appeal-id="evidenceAppealId" />

    <section class="record-section" aria-labelledby="decision-title">
      <h3 id="decision-title" class="record-heading">{{ mode === 'appeal' ? '申诉复核决定' : '审核决定' }}</h3>
      <p v-if="conflict" class="record-conflict" role="alert">你是申请人或原审核人，必须回避本次处理。</p>
      <div v-else class="record-actions">
        <NButton
          v-for="option in options"
          :key="option"
          :type="decisionType(option)"
          :disabled="busy"
          @click="$emit('decide', option)"
        >
          {{ decisionLabels[option] }}
        </NButton>
        <p v-if="!options.length" class="record-meta">当前没有可执行决定。待处理申诉须先独立复核。</p>
      </div>
      <p class="record-meta">核对证书、履历与声明后填写具体理由；决定将保留历史并记录审计。</p>
    </section>

    <CertificationHistoryList :history="history" :appeals="appeals" />
  </article>
</template>

<style scoped>
  .record {
    display: flex;
    flex-direction: column;
    gap: var(--admin-space-xl);
    min-width: 0;
  }

  .record-head {
    display: flex;
    flex-direction: column;
    gap: var(--admin-space-xs);
    padding-bottom: var(--admin-space-lg);
    border-bottom: 1px solid var(--admin-line);
  }

  .record-title {
    font-size: var(--admin-text-page-title-size);
    line-height: var(--admin-text-page-title-leading);
    font-weight: var(--admin-text-page-title-weight);
    color: var(--admin-ink);
    overflow-wrap: anywhere;
  }

  .record-title:focus-visible {
    box-shadow: none;
  }

  .record-meta {
    font-size: var(--admin-text-meta-size);
    line-height: var(--admin-text-meta-leading);
    color: var(--admin-muted);
    overflow-wrap: anywhere;
  }

  .record-status {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--admin-space-sm);
    font-size: var(--admin-text-body-size);
    line-height: var(--admin-text-body-leading);
    font-weight: var(--admin-text-body-strong-weight);
    color: var(--admin-body);
  }

  .record-note,
  .record-text {
    font-size: var(--admin-text-body-size);
    line-height: var(--admin-text-body-leading);
    color: var(--admin-body);
    white-space: pre-line;
    overflow-wrap: anywhere;
  }

  .record-section {
    display: flex;
    flex-direction: column;
    gap: var(--admin-space-md);
    padding-top: var(--admin-space-lg);
    border-top: 1px solid var(--admin-line);
  }

  .record-heading {
    font-size: var(--admin-text-section-title-size);
    line-height: var(--admin-text-section-title-leading);
    font-weight: var(--admin-text-section-title-weight);
    color: var(--admin-ink);
  }

  .record-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--admin-space-lg);
  }

  .record-field {
    min-width: 0;
  }

  dt {
    font-size: var(--admin-text-meta-size);
    line-height: var(--admin-text-meta-leading);
    color: var(--admin-muted);
  }

  dd {
    margin: 0;
    font-size: var(--admin-text-body-size);
    line-height: var(--admin-text-body-leading);
    color: var(--admin-ink);
    overflow-wrap: anywhere;
  }

  dd.is-mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  .record-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--admin-space-md);
  }

  .record-conflict {
    font-size: var(--admin-text-body-size);
    line-height: var(--admin-text-body-leading);
    color: var(--admin-danger-hover);
  }

  @media (min-width: 768px) {
    .record-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
