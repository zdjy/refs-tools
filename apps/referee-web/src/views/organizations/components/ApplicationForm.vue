<script setup lang="ts">
import { computed } from 'vue'
import { NAlert, NButton, NInput } from 'naive-ui'
import UiRegionSelect, { type RegionSelection } from '../../../components/ui/UiRegionSelect.vue'
import UiSubmitHint from '../../../components/ui/UiSubmitHint.vue'
import { applicationLimits, type ApplicationFieldKey, type ApplicationFields } from '../useOrganizationApplication'
import type { ApplicantProfile } from '../useApplicantProfile'
import ApplicantSummary from './ApplicantSummary.vue'

/**
 * 创建组织申请表单。字段错误就近显示并通过 aria-describedby 关联；
 * 所在地区与账号设置共用同一个三级选择器；负责人实名与联系方式取自账号资料，只读展示不在此输入。
 */
const props = defineProps<{ fieldError: Partial<Record<ApplicationFieldKey, string>>; busy: boolean; error: string; applicant: ApplicantProfile }>()
const fields = defineModel<ApplicationFields>('fields', { required: true })
defineEmits<{ submit: [] }>()
const region = computed<RegionSelection>({
  get: () => fields.value.regionCode ? { code: fields.value.regionCode, label: fields.value.region } : null,
  set: (value) => { fields.value.regionCode = value?.code ?? null; fields.value.region = value?.label ?? '' },
})
const canSubmit = computed(() => props.applicant.complete)
</script>

<template>
  <form class="grid gap-5" novalidate :aria-busy="busy" @submit.prevent="$emit('submit')">
    <div class="grid gap-2">
      <label for="app-name" class="text-sm font-medium text-ink">组织名称</label>
      <n-input id="app-name" v-model:value="fields.name" placeholder="例如：某某市篮球裁判协会" :maxlength="applicationLimits.name" :disabled="busy"
        :status="fieldError.name ? 'error' : 'success'"
        :input-props="{ 'aria-required': true, 'aria-invalid': !!fieldError.name, 'aria-describedby': fieldError.name ? 'app-name-error' : undefined, autocomplete: 'off' }" />
      <p v-if="fieldError.name" id="app-name-error" role="alert" class="m-0 text-[13px] text-danger">{{ fieldError.name }}</p>
    </div>
    <div class="grid gap-2">
      <span id="app-region-label" class="text-sm font-medium text-ink">所在地区</span>
      <UiRegionSelect v-model="region" :disabled="busy" :invalid="!!fieldError.region" aria-labelledby="app-region-label"
        :aria-describedby="fieldError.region ? 'app-region-error' : 'app-region-hint'" />
      <p v-if="fieldError.region" id="app-region-error" role="alert" class="m-0 text-[13px] text-danger">{{ fieldError.region }}</p>
      <p v-else id="app-region-hint" class="m-0 text-[13px] text-body">需选择到区/县；已选地区：{{ fields.region || '未选择' }}</p>
    </div>
    <div class="grid gap-2">
      <label for="app-purpose" class="text-sm font-medium text-ink">组织简介</label>
      <n-input id="app-purpose" v-model:value="fields.purpose" type="textarea" placeholder="组织的定位、服务对象与主要活动" :maxlength="applicationLimits.purpose"
        :autosize="{ minRows: 3, maxRows: 8 }" :disabled="busy" :status="fieldError.purpose ? 'error' : 'success'"
        :input-props="{ 'aria-required': true, 'aria-invalid': !!fieldError.purpose, 'aria-describedby': fieldError.purpose ? 'app-purpose-error' : undefined, autocomplete: 'off' }" />
      <p v-if="fieldError.purpose" id="app-purpose-error" role="alert" class="m-0 text-[13px] text-danger">{{ fieldError.purpose }}</p>
    </div>
    <ApplicantSummary :applicant="applicant" @reload="applicant.load()" />
    <n-alert v-if="error" type="error" :show-icon="false" role="alert">{{ error }}</n-alert>
    <UiSubmitHint :busy="busy" />
    <div><n-button type="primary" attr-type="submit" :loading="busy" :disabled="busy || !canSubmit">提交申请</n-button></div>
  </form>
</template>
