<script setup lang="ts">
import { computed } from 'vue'
import { NAlert, NButton, NPopconfirm } from 'naive-ui'
import type { Certification, CertificationAppeal, CertificationHistory } from '@refs-tools/contracts/certifications'
import { cancelButtonProps, confirmButtonProps } from '../../../components/ui/confirm-buttons'
import CertificationAppealList from './CertificationAppealList.vue'
import CertificationDetailFields from './CertificationDetailFields.vue'
import CertificationHistoryList from './CertificationHistoryList.vue'
import CertificationStatusBadge from './CertificationStatusBadge.vue'
import {
  certificationHeadline, certificationStatusText, canAppeal, canEdit, formatDateTime, pendingAppeal,
} from '../certifications.presentation'

/**
 * 本人认证详情与可执行动作。状态文案同时说明下一步；提交、申诉与编辑各自独立，
 * 不把不同写操作合并到一次请求里。待处理申诉期间隐藏普通审核入口。
 */
const props = defineProps<{
  record: Certification; orgNames: Record<string, string>; historyItems: CertificationHistory[]; appealItems: CertificationAppeal[]
  historyLoading: boolean; historyError: string; appealsLoading: boolean; appealsError: string
  busy: boolean; error: string; stale: string
}>()
const emit = defineEmits<{
  edit: []; submit: []; appeal: []; close: []
  retryHistory: []; retryAppeals: []
}>()
const openAppeal = computed(() => pendingAppeal(props.appealItems))
const editable = computed(() => canEdit(props.record) && !openAppeal.value)
const appealable = computed(() => canAppeal(props.record) && !openAppeal.value)
const statusHint = computed(() => certificationStatusText[props.record.status].hint)
</script>

<template>
  <section aria-labelledby="cert-detail-title" class="grid gap-6 border-0 border-t border-solid border-ink pt-6">
    <header class="grid gap-3">
      <p class="m-0 text-[13px] font-semibold text-body">当前记录</p>
      <div class="flex flex-wrap items-center gap-3">
        <h2 id="cert-detail-title" tabindex="-1" class="m-0 text-[24px] leading-tight font-bold tracking-[-.02em] text-ink wrap-anywhere focus:outline-hidden">{{ certificationHeadline(record, orgNames) }}</h2>
        <CertificationStatusBadge :status="record.status" />
        <CertificationStatusBadge v-if="record.effectiveStatus !== record.status" :status="record.effectiveStatus" :text="`效力：${certificationStatusText[record.effectiveStatus].label}`" />
      </div>
      <p class="m-0 max-w-[64ch] text-sm leading-relaxed text-body">{{ statusHint }}</p>
      <p v-if="record.effectiveStatus !== record.status" role="status" class="m-0 max-w-[64ch] rounded-xl border border-solid border-line bg-soft p-3 text-[13px] leading-relaxed text-ink">
        当前效力为「{{ certificationStatusText[record.effectiveStatus].label }}」：组织已冻结或你的成员关系已失效。恢复后效力自动恢复；人工暂停与撤销不会自动恢复。
      </p>
      <p class="m-0 font-mono text-[13px] text-body">版本 {{ record.version }} · 更新 {{ formatDateTime(record.updatedAt) }}</p>
      <div v-if="record.reviewNote" class="grid gap-1 border-0 border-l border-solid border-ink pl-3">
        <h3 class="m-0 text-sm font-semibold text-body">审核理由与补件要求</h3>
        <p class="m-0 whitespace-pre-line text-base leading-relaxed text-ink wrap-anywhere">{{ record.reviewNote }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <n-button v-if="editable" :disabled="busy" @click="emit('edit')">{{ record.status === 'draft' ? '继续申请' : '补充材料' }}</n-button>
        <n-popconfirm v-if="editable" :positive-button-props="confirmButtonProps" :negative-button-props="cancelButtonProps"
          positive-text="提交审核" negative-text="再核对一下" @positive-click="emit('submit')">
          <template #trigger><n-button type="primary" :loading="busy" :disabled="busy">提交审核</n-button></template>
          提交后进入审核队列，审核期间不能编辑材料。确认材料与声明均无误？
        </n-popconfirm>
        <n-button v-if="appealable" :disabled="busy" @click="emit('appeal')">提交申诉</n-button>
        <n-button secondary :disabled="busy" @click="emit('close')">收起详情</n-button>
      </div>
      <p v-if="openAppeal" role="status" class="m-0 text-sm leading-relaxed text-ink">已有待复核申诉，复核完成前不能提交新的申诉或修改结论。</p>
      <n-alert v-if="error" type="error" :show-icon="false" role="alert">{{ error }}</n-alert>
      <p v-if="stale" role="status" class="m-0 border-0 border-l border-solid border-ink py-0.5 pl-3 text-[13px] leading-relaxed text-body">{{ stale }}</p>
    </header>
    <CertificationDetailFields :record="record" :show-review="false" :org-names="orgNames" />
    <div v-if="appealsLoading" role="status" class="m-0 text-[13px] text-body">正在读取申诉记录…</div>
    <div v-else-if="appealsError" class="grid gap-2">
      <p role="alert" class="m-0 text-[13px] text-danger">{{ appealsError }}</p>
      <div><n-button secondary size="small" @click="emit('retryAppeals')">重新读取申诉</n-button></div>
    </div>
    <CertificationAppealList v-else :items="appealItems" :certification-id="record.id" />
    <CertificationHistoryList :items="historyItems" :loading="historyLoading" :error="historyError" @retry="emit('retryHistory')" />
  </section>
</template>
