<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton, NCard, NInputNumber, NPopconfirm } from 'naive-ui'
import { remainingMs, type ClockKind, type ClockState } from '../../../domain/workbench'
import { presentClock } from '../workbench.presentation'

const props = defineProps<{ clock: ClockState; now: number; disabled?: boolean }>()
const emit = defineEmits<{ toggle: [kind: ClockKind]; reset: [kind: ClockKind]; edit: [kind: ClockKind, seconds: number] }>()
const seconds = ref<number | null>(0)
const display = computed(() => presentClock(props.clock, props.now))
</script>

<template>
  <n-card
    class="clock-panel" :class="{ 'clock-running': clock.status === 'running', 'clock-expired': display.expired }"
    content-style="padding: 0;"
  >
    <div class="clock-body">
      <div class="clock-title">
        <span>{{ clock.label }}</span><span class="clock-state" role="status">{{ display.state }}</span>
      </div>
      <div class="clock-value" role="timer" :aria-label="clock.label" aria-live="off">{{ display.value }}</div>
      <div class="clock-controls">
        <n-button type="primary" :disabled="disabled || display.cannotStart" :aria-label="`${display.action}${clock.label}`" @click="emit('toggle', clock.kind)">
          {{ display.action }}
        </n-button>
        <n-popconfirm positive-text="重置" negative-text="取消" @positive-click="emit('reset', clock.kind)">
          <template #trigger><n-button quaternary circle class="icon-button" :disabled="disabled" :aria-label="`重置${clock.label}`">↺</n-button></template>
          重置{{ clock.label }}？当前剩余时间将被覆盖。
        </n-popconfirm>
      </div>
      <details v-if="!disabled && clock.status !== 'running'" class="clock-edit" @toggle="seconds = remainingMs(clock, now) / 1000">
        <summary>校正时间</summary>
        <form class="clock-edit-form" @submit.prevent="seconds !== null && emit('edit', clock.kind, seconds)">
          <n-input-number v-model:value="seconds" :min="0" :max="7200" :step="0.1" :precision="1" :show-button="false" :input-props="{ 'aria-label': `${clock.label}剩余秒数` }" />
          <n-button secondary attr-type="submit">设定秒数</n-button>
        </form>
      </details>
    </div>
  </n-card>
</template>
