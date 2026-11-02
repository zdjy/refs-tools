<script setup lang="ts">
import { NAlert, NButton, NInputNumber, NModal } from 'naive-ui'
import { refereeModalStyle } from '../../../ui-theme'
import type { WorkbenchRuleInput } from '../../../domain/workbench-commands'
import { ruleFields } from '../workbench.presentation'

const props = defineProps<{ show: boolean; rules: WorkbenchRuleInput; error: string }>()
const emit = defineEmits<{
  'update:show': [show: boolean]
  'update:rules': [rules: WorkbenchRuleInput]
  confirm: []
}>()
function updateRule(key: keyof WorkbenchRuleInput, value: number | null) {
  emit('update:rules', { ...props.rules, [key]: value })
}
</script>

<template>
  <n-modal
    :show="show" preset="card" title="比赛工作台" class="max-w-[460px] max-h-[90dvh] overflow-y-auto" :style="refereeModalStyle" aria-label="创建比赛工作台"
    :closable="false" :mask-closable="false" :segmented="{ footer: true }" @update:show="emit('update:show', $event)"
  >
    <p class="mt-0 mr-0 mb-5 ml-0 text-[14px] leading-[1.6] text-body">新会话固定本次配置。暂停按节分配（加时同额）；这不是完整 FIBA/NBA 规则，请按赛事核对。</p>
    <n-alert v-if="error" type="error" :show-icon="false" class="mb-3">{{ error }}</n-alert>
    <form id="create-workbench" class="grid grid-cols-[minmax(0,1fr)] gap-4 xs:grid-cols-2" @submit.prevent="emit('confirm')">
      <div v-for="field in ruleFields" :key="field.key" class="min-w-0">
        <label class="mb-2 block text-[14px] text-body" :for="`rule-${field.key}`">{{ field.label }}</label>
        <n-input-number
          :value="rules[field.key] ?? null" :min="1" :max="field.max" :precision="0" :show-button="false"
          :input-props="{ id: `rule-${field.key}`, inputmode: 'numeric', 'aria-required': true }"
          @update:value="updateRule(field.key, $event)"
        />
      </div>
    </form>
    <template #footer>
      <div class="flex flex-wrap justify-end gap-2">
        <n-button secondary @click="emit('update:show', false)">取消</n-button>
        <n-button type="primary" attr-type="submit" form="create-workbench">创建比赛</n-button>
      </div>
    </template>
  </n-modal>
</template>
