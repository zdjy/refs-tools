<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NDatePicker, NInput } from 'naive-ui'
import type { ProfileFieldKey, ProfileFieldsState } from '../useProfileSettings'
import RegionSelect, { type RegionSelection } from './RegionSelect.vue'

const props = defineProps<{ fields: ProfileFieldsState; fieldError: { field: ProfileFieldKey; message: string } | null; saving: boolean }>()
const emit = defineEmits<{ save: [] }>()

const invalid = (key: ProfileFieldKey) => props.fieldError?.field === key
const message = (key: ProfileFieldKey) => props.fieldError?.field === key ? props.fieldError.message : ''
const region = computed<RegionSelection>({
  get: () => props.fields.regionCode ? { code: props.fields.regionCode, label: props.fields.regionLabel ?? '' } : null,
  set: (value) => { props.fields.regionCode = value?.code ?? null; props.fields.regionLabel = value?.label ?? null },
})
const earliest = new Date(1900, 0, 1).getTime()
const isDateDisabled = (timestamp: number) => timestamp > Date.now() || timestamp < earliest
const textProps = (key: ProfileFieldKey, describedBy: string) => ({
  'aria-invalid': invalid(key), 'aria-describedby': describedBy,
})
</script>

<template>
  <form novalidate class="grid gap-5" :aria-busy="saving" @submit.prevent="emit('save')">
    <div class="grid gap-2">
      <label class="text-[14px] font-semibold" for="profile-nickname">昵称</label>
      <n-input id="profile-nickname" v-model:value="fields.nickname" :maxlength="80" :disabled="saving"
        placeholder="在社区与名册中展示的名称"
        v-bind="invalid('nickname') ? { status: 'error' as const } : {}" :input-props="textProps('nickname', 'profile-nickname-hint')" />
      <p id="profile-nickname-hint" class="m-0 text-[12px] leading-[1.7]" :class="invalid('nickname') ? 'text-red-hover' : 'text-body'">
        {{ message('nickname') || '1-80 个字符，首尾空白会被去掉；修改后顶栏与社区显示同步更新。' }}
      </p>
    </div>
    <div class="grid gap-2">
      <label class="text-[14px] font-semibold" for="profile-legal-name">真实姓名（选填）</label>
      <n-input id="profile-legal-name" v-model:value="fields.legalName" :maxlength="40" :disabled="saving"
        placeholder="用于需实名核对的场景"
        v-bind="invalid('legalName') ? { status: 'error' as const } : {}" :input-props="textProps('legalName', 'profile-legal-name-hint')" />
      <p id="profile-legal-name-hint" class="m-0 text-[12px] leading-[1.7]" :class="invalid('legalName') ? 'text-red-hover' : 'text-body'">
        {{ message('legalName') || '不超过 40 个字符；变更会写入审计日志，但日志不保存姓名内容。' }}
      </p>
    </div>
    <div class="grid gap-2">
      <label class="text-[14px] font-semibold" for="profile-phone">手机号（选填）</label>
      <n-input id="profile-phone" v-model:value="fields.phone" :maxlength="20" :disabled="saving"
        placeholder="+8613800138000"
        v-bind="invalid('phone') ? { status: 'error' as const } : {}" :input-props="{ ...textProps('phone', 'profile-phone-hint'), inputmode: 'tel' }" />
      <p id="profile-phone-hint" class="m-0 text-[12px] leading-[1.7]" :class="invalid('phone') ? 'text-red-hover' : 'text-body'">
        {{ message('phone') || '请填写含国家代码的完整号码。当前仅作联系方式保存，未做短信验证，也不能用于登录。' }}
      </p>
    </div>
    <div class="grid gap-2">
      <span id="profile-region-label" class="text-[14px] font-semibold">所在地区（选填）</span>
      <RegionSelect v-model="region" :disabled="saving" :invalid="invalid('region')" aria-labelledby="profile-region-label" />
      <p id="profile-region-hint" class="m-0 text-[12px] leading-[1.7]" :class="invalid('region') ? 'text-red-hover' : 'text-body'">
        {{ message('region') || '需选择到区/县才会保存；已选地区：' + (fields.regionLabel ?? '未填写') }}
      </p>
    </div>
    <div class="grid gap-2">
      <label class="text-[14px] font-semibold" for="profile-address">详细地址（选填）</label>
      <n-input id="profile-address" v-model:value="fields.addressDetail" :maxlength="200" :disabled="saving"
        placeholder="街道、门牌等补充信息"
        v-bind="invalid('addressDetail') ? { status: 'error' as const } : {}" :input-props="textProps('addressDetail', 'profile-address-hint')" />
      <p id="profile-address-hint" class="m-0 text-[12px] leading-[1.7]" :class="invalid('addressDetail') ? 'text-red-hover' : 'text-body'">
        {{ message('addressDetail') || '不超过 200 个字符；仅本人与有授权的管理者可见。' }}
      </p>
    </div>
    <div class="grid gap-2">
      <span class="text-[14px] font-semibold">出生日期（选填）</span>
      <n-date-picker v-model:formatted-value="fields.birthDate" type="date" value-format="yyyy-MM-dd" clearable
        :disabled="saving" :is-date-disabled="isDateDisabled" placeholder="选择日期" />
      <p class="m-0 text-[12px] leading-[1.7]" :class="invalid('birthDate') ? 'text-red-hover' : 'text-body'">
        {{ message('birthDate') || '可留空；范围 1900-01-01 至今天。' }}
      </p>
    </div>
    <div>
      <n-button type="primary" attr-type="submit" :loading="saving" :disabled="saving">保存账号资料</n-button>
    </div>
  </form>
</template>
