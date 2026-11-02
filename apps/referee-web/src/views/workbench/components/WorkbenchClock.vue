<script setup lang="ts">
import { computed, ref } from 'vue'
import { refereeControlThemes } from '../../../ui-theme'
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
    class="min-w-0 sm:first:col-span-2 lg:first:col-auto"
    content-style="padding: 0;"
  >
    <div class="p-4">
      <div class="flex items-center justify-between gap-2 text-[13px] text-body">
        <span>{{ clock.label }}</span><span class="text-[12px]" :class="display.expired ? 'text-red-hover' : clock.status === 'running' ? 'text-green' : ''" role="status">{{ display.state }}</span>
      </div>
      <div class="mx-0 my-3.5 text-[clamp(32px,7vw,42px)] leading-[1.1] font-[650] text-ink tabular-nums md:text-[34px] lg:text-[32px]" role="timer" :aria-label="clock.label" aria-live="off">{{ display.value }}</div>
      <div class="flex items-center gap-2">
        <n-button class="min-w-[86px]" type="primary" :disabled="disabled || display.cannotStart" :aria-label="`${display.action}${clock.label}`" @click="emit('toggle', clock.kind)">
          {{ display.action }}
        </n-button>
        <n-popconfirm positive-text="重置" negative-text="取消" @positive-click="emit('reset', clock.kind)">
          <template #trigger><n-button quaternary circle class="size-11" :theme-overrides="refereeControlThemes.iconButton" :disabled="disabled" :aria-label="`重置${clock.label}`"><span class="text-[22px]">↺</span></n-button></template>
          重置{{ clock.label }}？当前剩余时间将被覆盖。
        </n-popconfirm>
      </div>
      <details v-if="!disabled && clock.status !== 'running'" class="mt-3 text-[13px] text-body" @toggle="seconds = remainingMs(clock, now) / 1000">
        <summary class="flex min-h-11 cursor-pointer items-center">校正时间</summary>
        <form class="grid gap-2" @submit.prevent="seconds !== null && emit('edit', clock.kind, seconds)">
          <n-input-number v-model:value="seconds" :min="0" :max="7200" :step="0.1" :precision="1" :show-button="false" :input-props="{ 'aria-label': `${clock.label}剩余秒数` }" />
          <n-button secondary attr-type="submit">设定秒数</n-button>
        </form>
      </details>
    </div>
  </n-card>
</template>
