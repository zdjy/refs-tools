<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'
import { NAlert, NButton, NInputNumber, NModal } from 'naive-ui'
import { refereeModalStyle } from '../../../ui-theme'
import type { WorkbenchRuleInput } from '../../../domain/workbench-commands'
import { basicRuleKeys, rulePresets, ruleFields } from '../workbench.presentation'

const props = defineProps<{ show: boolean; rules: WorkbenchRuleInput; error: string }>()
const emit = defineEmits<{
  'update:show': [show: boolean]
  'update:rules': [rules: WorkbenchRuleInput]
  confirm: []
}>()
const basicFields = ruleFields.filter((field) => (basicRuleKeys as readonly string[]).includes(field.key))
const advancedFields = ruleFields.filter((field) => !(basicRuleKeys as readonly string[]).includes(field.key))
function updateRule(key: keyof WorkbenchRuleInput, value: number | null) {
  emit('update:rules', { ...props.rules, [key]: value })
}
const matches = (values: Partial<WorkbenchRuleInput>) => Object.entries(values).every(([key, value]) => props.rules[key as keyof WorkbenchRuleInput] === value)
</script>

<template>
  <n-modal
    :show="show" preset="card" title="新建比赛" class="max-w-[460px]" :style="refereeModalStyle" aria-label="创建比赛工作台"
    content-class="max-h-[60dvh] overflow-y-auto" :closable="false" :mask-closable="false" :segmented="{ footer: true }" @update:show="emit('update:show', $event)"
  >
    <p class="mt-0 mr-0 mb-4 ml-0 text-[14px] leading-[1.6] text-body">选一个常用配置快速预填，或直接修改参数。预填只是时长数值，不代表任何赛事的完整规则，请按赛事核对。</p>
    <div class="mb-4 flex flex-wrap gap-2" role="group" aria-label="参数预填">
      <n-button v-for="preset in rulePresets" :key="preset.id" secondary :type="matches(preset.values) ? 'primary' : 'default'" :aria-pressed="matches(preset.values)" @click="emit('update:rules', { ...rules, ...preset.values })">{{ preset.label }}</n-button>
    </div>
    <n-alert v-if="error" type="error" :show-icon="false" class="mb-3" role="alert">{{ error }}</n-alert>
    <form id="create-workbench" class="grid grid-cols-[minmax(0,1fr)] gap-4" @submit.prevent="emit('confirm')">
      <div class="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-3">
        <div v-for="field in basicFields" :key="field.key" class="min-w-0">
          <label class="mb-2 block text-[14px] text-body" :for="`rule-${field.key}`">{{ field.label }}</label>
          <n-input-number :value="rules[field.key] ?? null" :min="1" :max="field.max" :precision="0" :show-button="false" :input-props="{ id: `rule-${field.key}`, inputmode: 'numeric', 'aria-required': true }" @update:value="updateRule(field.key, $event)" />
        </div>
      </div>
      <details class="group rounded-xl border border-solid border-line">
        <summary class="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-[14px] font-medium text-ink [&::-webkit-details-marker]:hidden">
          高级参数<ChevronDown class="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div class="grid grid-cols-[minmax(0,1fr)] gap-4 border-0 border-t border-solid border-line p-4 sm:grid-cols-2">
          <div v-for="field in advancedFields" :key="field.key" class="min-w-0">
            <label class="mb-2 block text-[14px] text-body" :for="`rule-${field.key}`">{{ field.label }}</label>
            <n-input-number :value="rules[field.key] ?? null" :min="1" :max="field.max" :precision="0" :show-button="false" :input-props="{ id: `rule-${field.key}`, inputmode: 'numeric', 'aria-required': true }" @update:value="updateRule(field.key, $event)" />
          </div>
        </div>
      </details>
    </form>
    <template #footer>
      <div class="flex flex-wrap justify-end gap-2">
        <n-button secondary @click="emit('update:show', false)">取消</n-button>
        <n-button type="primary" attr-type="submit" form="create-workbench">创建比赛</n-button>
      </div>
    </template>
  </n-modal>
</template>
