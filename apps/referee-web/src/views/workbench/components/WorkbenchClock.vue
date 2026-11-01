<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NCard } from 'naive-ui'
import type { ClockKind, ClockState } from '../../../domain/workbench'
import { presentClock } from '../workbench.presentation'

const props = defineProps<{ clock: ClockState; now: number }>()
const emit = defineEmits<{ toggle: [kind: ClockKind]; reset: [kind: ClockKind] }>()
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
        <n-button type="primary" :disabled="display.cannotStart" :aria-label="`${display.action}${clock.label}`" @click="emit('toggle', clock.kind)">
          {{ display.action }}
        </n-button>
        <n-button quaternary circle class="icon-button" :aria-label="`重置${clock.label}`" @click="emit('reset', clock.kind)">↺</n-button>
      </div>
    </div>
  </n-card>
</template>
