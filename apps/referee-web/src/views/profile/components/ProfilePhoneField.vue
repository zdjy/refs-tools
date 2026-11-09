<script setup lang="ts">
import { computed, ref, watch, type InputHTMLAttributes } from 'vue'
import { NInput, NSelect, type SelectOption } from 'naive-ui'
import { composePhone, dialCodeOptions, matchesDialCode, splitPhone, type DialCodeOption } from '../../../domain/phone'

/**
 * 手机号输入：国家/地区代码用可搜索下拉框选择，本地号码单独输入。
 * 对父级只暴露 E.164 字符串，档案字段与校验规则保持不变。
 */
const props = defineProps<{ modelValue: string; inputId: string; describedBy: string; disabled?: boolean; invalid?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const parsed = computed(() => splitPhone(props.modelValue))
const dial = ref(parsed.value.dial)
// 本地号码为空时父级的 E.164 也只剩区号，不能让已选好的区号跟着跳回默认值。
watch(parsed, (value) => { if (value.national !== '') dial.value = value.dial }, { immediate: true })

const errorStatus = computed(() => props.invalid === true ? { status: 'error' as const } : {})
const inputProps = computed<InputHTMLAttributes>(() => ({
  id: props.inputId,
  inputmode: 'tel',
  autocomplete: 'tel',
  'aria-invalid': props.invalid === true,
  'aria-describedby': props.describedBy,
}))
const selectInputProps = computed<InputHTMLAttributes>(() => ({
  'aria-label': '国家/地区代码',
  'aria-invalid': props.invalid === true,
  'aria-describedby': props.describedBy,
}))

function setDial(value: string) {
  dial.value = value
  emit('update:modelValue', composePhone(value, parsed.value.national))
}

/** 本地号码框被粘贴进 `+8613…` 这类完整号码时，识别国家代码后只保留本地号码。 */
function setNational(raw: string) {
  if (raw.trimStart().startsWith('+')) {
    const pasted = splitPhone(raw)
    dial.value = pasted.dial
    emit('update:modelValue', composePhone(pasted.dial, pasted.national))
    return
  }
  emit('update:modelValue', composePhone(dial.value, raw))
}

/** 下拉框搜索同时匹配中文地区名、ISO 代码与国家代码数字。 */
const filter = (pattern: string, option: SelectOption): boolean => matchesDialCode(pattern, option as unknown as DialCodeOption)

/** 下拉选项数据是只读常量，Naive UI 的 options prop 要求可变数组，这里做唯一一次转换。 */
const options = dialCodeOptions as unknown as SelectOption[]
</script>

<template>
  <div class="grid grid-cols-[8.5rem_minmax(0,1fr)] items-start gap-2 sm:grid-cols-[10rem_minmax(0,1fr)]">
    <n-select :value="dial" :options="options" :filter="filter" filterable :disabled="disabled"
      placeholder="国家/地区代码" :input-props="selectInputProps" v-bind="errorStatus" @update:value="setDial" />
    <!-- 上限 20 位只为容纳整段粘贴的 E.164，最终长度由档案校验统一判定。 -->
    <n-input :value="parsed.national" :maxlength="20" :disabled="disabled" placeholder="13800138000"
      :input-props="inputProps" v-bind="errorStatus" @update:value="setNational" />
  </div>
</template>
