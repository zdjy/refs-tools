<script setup lang="ts">
import { computed } from 'vue'
import { RotateCcw } from '@lucide/vue'
import { NButton } from 'naive-ui'
import type { WorkbenchSession } from '../../../domain/workbench'
import { refereeControlThemes } from '../../../ui-theme'
import { periodLabel, presentClock } from '../workbench.presentation'

const props = defineProps<{ session: WorkbenchSession; now: number }>()
const emit = defineEmits<{ toggle: []; resetShot: [seconds: number] }>()
const game = computed(() => presentClock(props.session.clocks.game, props.now))
const shot = computed(() => presentClock(props.session.clocks.shot, props.now))
const shotSeconds = computed(() => props.session.rules.shotClockDurationMs / 1000)
const period = computed(() => periodLabel(props.session.period, props.session.rules.periodCount))
const sides = ['home', 'away'] as const
</script>

<template>
  <!-- 仅手机显示：桌面/平板页头已吸顶，此处让比分与两个常用时钟在滚动记录时保持可见。展示用，读数不进入 live region。 -->
  <div
    role="group" :aria-label="`实时记分条，${period}`"
    class="sticky top-0 z-30 -mx-3 mb-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] items-center gap-2 border-0 border-b border-solid border-line bg-canvas px-3 py-2 xs:-mx-4 xs:px-4 compact:-mx-5 compact:px-5 md:-mx-6 md:px-6 tablet:hidden"
  >
    <div v-for="side in sides" :key="side" class="min-w-0">
      <p class="m-0 truncate text-[13px] text-body">{{ session.scorer.teams[side].name }}</p>
      <p class="m-0 text-[28px] leading-none font-bold text-ink tabular-nums">{{ session.scorer.teams[side].score }}</p>
    </div>
    <n-button
      :type="session.clocks.game.status === 'running' ? 'primary' : 'default'" :secondary="session.clocks.game.status !== 'running'" :theme-overrides="refereeControlThemes.stripButton"
      :disabled="game.cannotStart" :aria-label="`${game.action}比赛计时`" @click="emit('toggle')"
    >
      <span class="grid justify-items-center leading-tight">
        <span class="text-[13px] font-medium">{{ period }}</span>
        <span class="text-[20px] font-bold tabular-nums">{{ game.value }}</span>
      </span>
    </n-button>
    <n-button secondary :theme-overrides="refereeControlThemes.compactButton" :aria-label="`进攻计时重置为 ${shotSeconds} 秒，当前 ${shot.value}`" @click="emit('resetShot', shotSeconds)">
      <RotateCcw class="mr-1 size-4" aria-hidden="true" /><span class="tabular-nums">{{ shot.value }}</span>
    </n-button>
  </div>
</template>
