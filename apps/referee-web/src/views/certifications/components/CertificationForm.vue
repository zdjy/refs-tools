<script setup lang="ts">
import { computed } from 'vue'
import { NAlert, NButton } from 'naive-ui'
import type { Certification, CreateCertification, UpdateCertification } from '@refs-tools/contracts/certifications'
import type { MyOrganization } from '@refs-tools/contracts/organization-self'
import UiSubmitHint from '../../../components/ui/UiSubmitHint.vue'
import CertificationMaterialFields from './CertificationMaterialFields.vue'
import CertificationMediaField from './CertificationMediaField.vue'
import CertificationScopeFields from './CertificationScopeFields.vue'
import { certificationLimits, createBodyFrom, updateBodyFrom, uploadOptionsFor, useCertificationDraft } from '../useCertificationDraft'

/**
 * 新建或补件表单。保存只产生草稿/新版本，是否提交审核由详情页的独立操作确认，
 * 避免「创建成功但提交失败」被合并成一次失败提示。
 */
const props = defineProps<{
  initial: Certification | null; organizations: MyOrganization[]; takenOrganizationIds: string[]; platformTaken: boolean
  platformEligible: boolean; editing: boolean; busy: boolean; error: string; defaultScope?: 'organization' | 'platform'; defaultOrganizationId?: string | null
}>()
const emit = defineEmits<{
  save: [payload: { body: CreateCertification | UpdateCertification; mode: 'create' | 'update' }]
  cancel: []
}>()
const draft = useCertificationDraft(props.initial)
const availableOrganizations = computed(() => props.organizations.filter((item) => !props.takenOrganizationIds.includes(item.id)))
const uploadOptions = computed(() => uploadOptionsFor(draft.fields))
if (!props.initial) {
  const preferred = availableOrganizations.value.find((item) => item.id === props.defaultOrganizationId)?.id
  const firstOrganization = preferred ?? availableOrganizations.value[0]?.id ?? null
  draft.changeScope(props.defaultScope === 'platform' ? 'platform' : 'organization', props.defaultScope === 'platform' ? null : firstOrganization)
}
function changeScope(type: 'organization' | 'platform', organizationId: string | null) {
  draft.changeScope(type, organizationId)
}
function submit() {
  if (!draft.validate(!props.editing)) return
  if (props.editing && props.initial) emit('save', { body: updateBodyFrom(draft.fields, props.initial.version), mode: 'update' })
  else emit('save', { body: createBodyFrom(draft.fields), mode: 'create' })
}
</script>

<template>
  <form class="grid gap-6 border-0 border-t border-solid border-ink pt-5 compact:p-6" novalidate :aria-busy="busy" @submit.prevent="submit">
    <header class="grid gap-2">
      <h2 class="m-0 text-xl text-ink">{{ editing ? '编辑申请材料' : '申请认证' }}</h2>
      <p class="m-0 max-w-[64ch] text-sm leading-relaxed text-body">
        {{ editing ? '保存后会生成新版本并保留旧材料。补件只适用于草稿或「需补件」状态。' : '材料先保存为草稿，核对无误后再提交审核；提交后不能直接编辑。' }}
      </p>
    </header>
    <CertificationScopeFields v-model:fields="draft.fields" :organizations="organizations" :taken-organization-ids="takenOrganizationIds"
      :platform-taken="platformTaken" :platform-eligible="platformEligible" :editing="editing" :disabled="busy"
      :organization-id="draft.fields.organizationId" :organization-problem="draft.problems.organizationId"
      @change-scope="changeScope" />
    <CertificationMaterialFields v-model:fields="draft.fields" :problems="draft.problems" :disabled="busy" />
    <CertificationMediaField label="证书原件" hint="证书正面、发证页或有效证明；支持图片与 PDF，单个文件不超过大小限制。"
      :ids="draft.fields.evidenceMediaIds" :options="uploadOptions" :problem="draft.problems.evidence" :disabled="busy"
      :max="certificationLimits.media" @add="draft.add('evidenceMediaIds', $event)" @remove="draft.remove('evidenceMediaIds', $event)" />
    <CertificationMediaField label="履历材料" hint="执裁经历、培训记录或选派证明；与原件分开上传，便于审核逐类核对。"
      :ids="draft.fields.historyMediaIds" :options="uploadOptions" :problem="draft.problems.history" :disabled="busy"
      :max="certificationLimits.media" @add="draft.add('historyMediaIds', $event)" @remove="draft.remove('historyMediaIds', $event)" />
    <n-alert v-if="error" type="error" :show-icon="false" role="alert">{{ error }}</n-alert>
    <UiSubmitHint :busy="busy" />
    <div class="flex flex-wrap justify-end gap-2">
      <n-button secondary :disabled="busy" @click="emit('cancel')">取消</n-button>
      <n-button type="primary" attr-type="submit" :loading="busy" :disabled="busy">{{ editing ? '保存材料' : '保存草稿' }}</n-button>
    </div>
  </form>
</template>
