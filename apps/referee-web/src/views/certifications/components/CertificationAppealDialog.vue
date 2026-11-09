<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NAlert, NButton, NInput, NModal } from 'naive-ui'
import type { Certification } from '@refs-tools/contracts/certifications'
import type { UploadOptions } from '../../../features/media/direct-upload'
import { refereeModalStyle } from '../../../ui-theme'
import { REASON_MAX, reasonProblem } from '../../../domain/audit-reason'
import UiSubmitHint from '../../../components/ui/UiSubmitHint.vue'
import CertificationMediaField from './CertificationMediaField.vue'

/** 申诉只针对驳回或撤销结果，补充材料可选；提交后原认证效力在复核前不变。 */
const props = defineProps<{
  show: boolean; record: Certification | null; uploadOptions: UploadOptions; busy: boolean; error: string
}>()
const emit = defineEmits<{ 'update:show': [value: boolean]; confirm: [body: { reason: string; evidenceMediaIds: string[] }] }>()
const reason = ref('')
const evidenceMediaIds = ref<string[]>([])
const problem = ref('')
const limit = 10
const canAdd = computed(() => evidenceMediaIds.value.length < limit)
watch(() => props.show, (visible) => { if (visible) { reason.value = ''; evidenceMediaIds.value = []; problem.value = '' } })
function submit() {
  problem.value = reasonProblem(reason.value)
  if (problem.value) return
  emit('confirm', { reason: reason.value.trim(), evidenceMediaIds: [...evidenceMediaIds.value] })
}
</script>

<template>
  <n-modal :show="show" preset="card" title="提交认证申诉" class="max-w-[620px]" :style="refereeModalStyle" :aria-label="'提交认证申诉'"
    :closable="!busy" :mask-closable="false" :close-on-esc="!busy" @update:show="emit('update:show', $event)">
    <form class="grid gap-4" @submit.prevent="submit">
      <p class="m-0 max-w-[60ch] text-sm leading-relaxed text-body">
        申诉会交给独立复核人处理，原审核人必须回避。复核前原认证结论与效力保持不变。
      </p>
      <div v-if="record" class="grid gap-1 rounded-xl border border-solid border-line bg-soft p-3 text-[13px] leading-relaxed text-ink">
        <span class="font-semibold">{{ record.certificateNumber }} · 版本 {{ record.version }}</span>
        <span v-if="record.reviewNote" class="text-body wrap-anywhere">{{ record.reviewNote }}</span>
      </div>
      <div class="grid gap-2">
        <label for="appeal-reason" class="text-sm font-medium text-ink">申诉理由</label>
        <n-input id="appeal-reason" v-model:value="reason" type="textarea" :maxlength="REASON_MAX" show-count
          :autosize="{ minRows: 4, maxRows: 8 }" :disabled="busy" placeholder="说明你认为原决定需要复核的事实与依据"
          :status="problem ? 'error' : 'success'"
          :input-props="{ 'aria-required': true, 'aria-invalid': !!problem, 'aria-describedby': problem ? 'appeal-reason-error' : undefined }" />
        <p v-if="problem" id="appeal-reason-error" role="alert" class="m-0 text-[13px] text-danger">{{ problem }}</p>
      </div>
      <CertificationMediaField label="申诉补充材料" hint="可选。最多 10 个，须与本次认证范围一致；复核人通过认证专用入口读取。"
        :ids="evidenceMediaIds" :options="uploadOptions" :disabled="busy || !canAdd" :max="limit"
        @add="evidenceMediaIds.push($event)" @remove="evidenceMediaIds.splice($event, 1)" />
      <n-alert v-if="error" type="error" :show-icon="false" role="alert">{{ error }}</n-alert>
      <UiSubmitHint :busy="busy" />
      <div class="flex flex-wrap justify-end gap-2">
        <n-button secondary :disabled="busy" @click="emit('update:show', false)">取消</n-button>
        <n-button type="primary" attr-type="submit" :loading="busy" :disabled="busy">提交申诉</n-button>
      </div>
    </form>
  </n-modal>
</template>
