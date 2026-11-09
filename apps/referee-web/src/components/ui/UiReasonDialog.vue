<script setup lang="ts">
import { computed } from 'vue'
import { NAlert, NButton, NInput, NModal } from 'naive-ui'
import { refereeModalStyle } from '../../ui-theme'
import UiSubmitHint from './UiSubmitHint.vue'
import { REASON_MAX } from '../../domain/audit-reason'

/**
 * 需要理由与二次确认的通用弹窗：成员管理、认证审核等写操作复用同一交互。
 * 弹窗未关闭时错误与结果都在这里显示；提交期间不可关闭，避免用户误以为已取消。
 * 理由会进入审计，因此提示不要填写链接或凭据。
 */
const props = defineProps<{
  show: boolean; title: string; description: string; confirmLabel: string
  busy: boolean; error: string; problem: string; danger?: boolean
}>()
const reason = defineModel<string>('reason', { required: true })
const emit = defineEmits<{ 'update:show': [value: boolean]; confirm: [] }>()
const invalid = computed(() => !!props.problem)
</script>

<template>
  <n-modal :show="show" preset="card" :title="title" class="max-w-[460px]" :style="refereeModalStyle" :aria-label="title"
    :closable="!busy" :mask-closable="false" :close-on-esc="!busy" @update:show="emit('update:show', $event)">
    <form class="grid gap-4" @submit.prevent="emit('confirm')">
      <p class="m-0 text-sm leading-relaxed text-body">{{ description }}</p>
      <div class="grid gap-2">
        <label for="reason-input" class="text-sm font-medium text-ink">操作理由（会记入审计）</label>
        <n-input id="reason-input" v-model:value="reason" type="textarea" :maxlength="REASON_MAX" show-count :autosize="{ minRows: 3, maxRows: 6 }"
          :status="invalid ? 'error' : 'success'" placeholder="例如：核实身份后批准" :input-props="{ 'aria-invalid': invalid, 'aria-describedby': invalid ? 'reason-problem' : undefined }" />
        <p v-if="problem" id="reason-problem" role="alert" class="m-0 text-[13px] text-danger">{{ problem }}</p>
      </div>
      <n-alert v-if="error" type="error" :show-icon="false" role="alert">{{ error }}</n-alert>
      <UiSubmitHint :busy="busy" />
      <div class="flex flex-wrap justify-end gap-2">
        <n-button secondary :disabled="busy" @click="emit('update:show', false)">取消</n-button>
        <n-button :type="danger ? 'error' : 'primary'" attr-type="submit" :loading="busy" :disabled="busy">{{ confirmLabel }}</n-button>
      </div>
    </form>
  </n-modal>
</template>
