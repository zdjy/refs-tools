<script setup lang="ts">
import { onBeforeRouteLeave } from 'vue-router'
import { NAlert, NButton, NModal } from 'naive-ui'
import { useCertificationForm, type CertificationFormProps, type CertificationFormSave } from '../useCertificationForm'
import UiSubmitHint from '../../../components/ui/UiSubmitHint.vue'
import CertificationApplicationSummary from './CertificationApplicationSummary.vue'
import CertificationMaterialFields from './CertificationMaterialFields.vue'
import CertificationMediaField from './CertificationMediaField.vue'
import CertificationScopeFields from './CertificationScopeFields.vue'
import { certificationLimits } from '../useCertificationDraft'

/**
 * 分步核对后保存或提交；上传和写入期间锁定步骤，避免范围与已核验材料错配。
 */
const props = defineProps<CertificationFormProps>()
const emit = defineEmits<{
  save: [payload: CertificationFormSave]
  cancel: []
}>()
const { draft, ui, organizationName, uploadOptions, next, changeScope, confirmScope, cancel, submit } = useCertificationForm(props, payload => emit('save', payload), () => emit('cancel'))
const { step, root, locked, evidenceBusy, historyBusy, scopeChange, cancelRequested } = ui
onBeforeRouteLeave(() => !locked.value && (!ui.dirty.value || window.confirm('申请材料尚未保存，确认离开并放弃本次修改？')))
const steps = ['选择范围', '填写材料', '核对提交']
</script>

<template>
  <form ref="root" class="grid gap-6 border-0 border-t border-solid border-ink pt-5 compact:p-6" novalidate :aria-busy="busy" @submit.prevent="step < 2 ? next() : submit(true)">
    <header class="grid gap-2">
      <h2 tabindex="-1" class="m-0 text-xl text-ink">{{ editing ? '编辑申请材料' : '申请认证' }}</h2>
      <p class="m-0 max-w-[64ch] text-sm leading-relaxed text-body">
        {{ editing ? '保存后会生成新版本并保留旧材料。补件只适用于草稿或「需补件」状态。' : '填写材料并核对后，可保存草稿或直接提交审核；审核期间不能编辑。' }}
      </p>
    </header>
    <ol class="m-0 grid list-none grid-cols-3 gap-2 p-0" aria-label="申请步骤">
      <li v-for="(label, index) in steps" :key="label" :aria-current="step === index ? 'step' : undefined"
        class="border-0 border-b border-solid pb-3 text-sm" :class="step === index ? 'border-ink font-semibold text-ink' : 'border-line text-body'">
        <span class="mr-1 font-mono">{{ index + 1 }}</span>{{ label }}
      </li>
    </ol>
    <p v-if="initial?.status === 'needs_more_information' && initial.reviewNote" role="status" class="m-0 border-0 border-l border-solid border-ink pl-3 text-base leading-relaxed text-ink">补件要求：{{ initial.reviewNote }}</p>
    <CertificationScopeFields v-if="step === 0" v-model:fields="draft.fields" :organizations="organizations" :taken-organization-ids="takenOrganizationIds"
      :platform-taken="platformTaken" :platform-eligible="platformEligible" :editing="editing" :disabled="locked"
      :organization-id="draft.fields.organizationId" :organization-problem="draft.problems.organizationId"
      @change-scope="changeScope" />
    <div v-show="step === 1" class="grid gap-6">
    <CertificationMaterialFields v-model:fields="draft.fields" :problems="draft.problems" :disabled="locked" />
    <CertificationMediaField :key="`evidence-${draft.fields.scopeType}-${draft.fields.organizationId}`" label="证书原件" hint="证书正面、发证页或有效证明；支持图片与 PDF，单个文件不超过大小限制。"
      :ids="draft.fields.evidenceMediaIds" :options="uploadOptions" :problem="draft.problems.evidence" :disabled="busy"
      :max="certificationLimits.media" @add="draft.add('evidenceMediaIds', $event)" @remove="draft.remove('evidenceMediaIds', $event)" @busy="evidenceBusy = $event" />
    <CertificationMediaField :key="`history-${draft.fields.scopeType}-${draft.fields.organizationId}`" label="履历材料" hint="执裁经历、培训记录或选派证明；与原件分开上传，便于审核逐类核对。"
      :ids="draft.fields.historyMediaIds" :options="uploadOptions" :problem="draft.problems.history" :disabled="busy"
      :max="certificationLimits.media" @add="draft.add('historyMediaIds', $event)" @remove="draft.remove('historyMediaIds', $event)" @busy="historyBusy = $event" />
    </div>
    <CertificationApplicationSummary v-if="step === 2" :fields="draft.fields" :organization-name="organizationName" />
    <n-alert v-if="error" type="error" :show-icon="false" role="alert">{{ error }}</n-alert>
    <UiSubmitHint :busy="busy" />
    <p v-if="evidenceBusy || historyBusy" role="status" class="m-0 text-sm text-body">材料正在上传或核验，请完成或取消上传后继续。</p>
    <div class="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
      <n-button secondary :disabled="locked" @click="cancel">取消申请</n-button>
      <n-button v-if="step > (editing ? 1 : 0)" secondary :disabled="locked" @click="step--">上一步</n-button>
      <n-button v-if="step === 2" secondary :loading="busy" :disabled="locked" @click="submit(false)">{{ editing ? '保存材料' : '保存草稿' }}</n-button>
      <n-button type="primary" attr-type="submit" :loading="busy" :disabled="locked">{{ step === 2 ? '提交审核' : '下一步' }}</n-button>
    </div>
  </form>
  <n-modal :show="!!scopeChange" preset="dialog" title="更换认证范围" content="更换范围将清空当前已上传材料，需要重新上传。确认继续？" positive-text="更换范围" negative-text="保留当前范围" @positive-click="confirmScope" @negative-click="scopeChange = null" @update:show="!$event && (scopeChange = null)" />
  <n-modal :show="cancelRequested" preset="dialog" title="放弃未保存的修改" content="本次填写和材料引用尚未保存，确认返回？" positive-text="放弃修改" negative-text="继续填写" @positive-click="emit('cancel')" @negative-click="cancelRequested = false" @update:show="!$event && (cancelRequested = false)" />
</template>
