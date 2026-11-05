<script setup lang="ts">
import { NAlert, NButton, NInput } from 'naive-ui'
import type { OrganizationApplication } from '@refs-tools/contracts/organization-self'
import UiSubmitHint from '../../../components/ui/UiSubmitHint.vue'
import { applicationLimits } from '../useOrganizationApplication'

/**
 * 创建组织申请表单。字段错误就近显示并通过 aria-describedby 关联；
 * 实名与联系方式只供平台审核，页面明示不会公开，减少用户的填写顾虑。
 */
defineProps<{ fieldError: Partial<Record<keyof OrganizationApplication, string>>; busy: boolean; error: string }>()
const fields = defineModel<OrganizationApplication>('fields', { required: true })
defineEmits<{ submit: [] }>()
const rows = [
  { key: 'name', label: '组织名称', placeholder: '例如：某某市篮球裁判协会', textarea: false },
  { key: 'region', label: '所在地区', placeholder: '例如：浙江省杭州市', textarea: false },
  { key: 'purpose', label: '组织简介', placeholder: '组织的定位、服务对象与主要活动', textarea: true },
  { key: 'ownerLegalName', label: '负责人实名', placeholder: '与证件一致的姓名', textarea: false },
  { key: 'contact', label: '联系方式', placeholder: '手机号或常用邮箱', textarea: false },
] as const
</script>

<template>
  <form class="grid gap-5" novalidate @submit.prevent="$emit('submit')">
    <div v-for="row in rows" :key="row.key" class="grid gap-2">
      <label :for="`app-${row.key}`" class="text-sm font-medium text-ink">{{ row.label }}</label>
      <n-input :id="`app-${row.key}`" v-model:value="fields[row.key]" :type="row.textarea ? 'textarea' : 'text'" :placeholder="row.placeholder"
        :maxlength="applicationLimits[row.key]" :autosize="{ minRows: row.textarea ? 3 : 1, maxRows: row.textarea ? 8 : 1 }" :disabled="busy"
        :status="fieldError[row.key] ? 'error' : 'success'"
        :input-props="{ 'aria-required': true, 'aria-invalid': !!fieldError[row.key], 'aria-describedby': fieldError[row.key] ? `app-${row.key}-error` : undefined, autocomplete: 'off' }" />
      <p v-if="fieldError[row.key]" :id="`app-${row.key}-error`" role="alert" class="m-0 text-[13px] text-danger">{{ fieldError[row.key] }}</p>
    </div>
    <p class="m-0 text-[13px] leading-relaxed text-body">实名与联系方式只用于平台审核，不会在目录或成员名单中公开。</p>
    <n-alert v-if="error" type="error" :show-icon="false" role="alert">{{ error }}</n-alert>
    <UiSubmitHint :busy="busy" />
    <div><n-button type="primary" attr-type="submit" :loading="busy" :disabled="busy">提交申请</n-button></div>
  </form>
</template>
