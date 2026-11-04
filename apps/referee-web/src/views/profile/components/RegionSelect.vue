<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NSelect } from 'naive-ui'
import { regionLabel, regionProvinces } from '../../../content/regions'

export type RegionSelection = { code: string; label: string } | null

const props = defineProps<{ modelValue: RegionSelection; disabled?: boolean; invalid?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: RegionSelection] }>()

const provinceCode = ref<string | null>(null)
const cityCode = ref<string | null>(null)
const districtCode = ref<string | null>(null)

const province = computed(() => regionProvinces.find((item) => item.code === provinceCode.value) ?? null)
const city = computed(() => province.value?.cities.find((item) => item.code === cityCode.value) ?? null)
const provinceOptions = regionProvinces.map((item) => ({ label: item.name, value: item.code }))
const cityOptions = computed(() => (province.value?.cities ?? []).map((item) => ({ label: item.name, value: item.code })))
const districtOptions = computed(() => (city.value?.districts ?? []).map((item) => ({ label: item.name, value: item.code })))

/** 只在父级给出完整区县代码时同步三级选择；不完整的中间态只保留在本地。 */
function sync(code: string | null | undefined) {
  if (!code) return
  provinceCode.value = code.slice(0, 2); cityCode.value = code.slice(0, 4); districtCode.value = code
}
sync(props.modelValue?.code)
watch(() => props.modelValue?.code, (code) => sync(code))

/** 上层变更会让下层失效，因此同时把不完整的中间态回写为“未填写”。 */
function changeProvince(code: string) {
  provinceCode.value = code; districtCode.value = null
  // 直辖市/特别区域只有一个市级节点（如“市辖区”），自动带出以减少一次无意义选择。
  const cities = regionProvinces.find((item) => item.code === code)?.cities ?? []
  cityCode.value = cities.length === 1 ? cities[0]!.code : null
  emit('update:modelValue', null)
}
function changeCity(code: string) {
  cityCode.value = code; districtCode.value = null
  emit('update:modelValue', null)
}
function changeDistrict(code: string) {
  districtCode.value = code
  const chosen = city.value?.districts.find((item) => item.code === code)
  if (province.value && city.value && chosen) emit('update:modelValue', { code, label: regionLabel(province.value, city.value, chosen) })
}
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-3" role="group" aria-label="所在地区">
    <n-select :value="provinceCode" :options="provinceOptions" :disabled="disabled" placeholder="省/直辖市"
      v-bind="invalid ? { status: 'error' as const } : {}" @update:value="changeProvince" />
    <n-select :value="cityCode" :options="cityOptions" :disabled="disabled || !provinceCode" placeholder="市"
      v-bind="invalid ? { status: 'error' as const } : {}" @update:value="changeCity" />
    <n-select :value="districtCode" :options="districtOptions" :disabled="disabled || !cityCode" placeholder="区/县"
      v-bind="invalid ? { status: 'error' as const } : {}" @update:value="changeDistrict" />
  </div>
</template>
