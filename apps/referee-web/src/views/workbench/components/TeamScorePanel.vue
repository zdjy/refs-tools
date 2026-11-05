<script setup lang="ts">
import { ref, watch } from 'vue'
import { ArrowLeft, ArrowRight, ChevronDown, Minus, Plus } from '@lucide/vue'
import { NButton, NInput } from 'naive-ui'
import type { TeamRecord, TeamSide, TeamStat } from '../../../domain/scorer'
import { refereeControlThemes } from '../../../ui-theme'
const props = defineProps<{ team: TeamRecord; side: TeamSide; fouls: number; limit: number; possession: boolean; timeoutActive: boolean; periodScore: number }>()
const emit = defineEmits<{
  stat: [side: TeamSide, stat: TeamStat]; correct: [side: TeamSide, delta: number]
  foul: [side: TeamSide, delta: number]; timeout: [side: TeamSide]; restore: [side: TeamSide]
  rename: [side: TeamSide, name: string]; possession: [side: TeamSide]
}>()
const sideLabel = props.side === 'home' ? '主队' : '客队'
const name = ref(props.team.name)
watch(() => props.team.name, (value) => { name.value = value })
</script>

<template>
  <!-- 手机上两队并排，卡片内边距随断点收窄，保证 +1/+2/+3 三个 44px 目标在 375px 宽的半栏内不溢出。 -->
  <section class="min-w-0 rounded-xl border border-solid border-line bg-surface p-2 shadow-card xs:p-3 compact:p-5 xl:first:col-start-1 xl:first:row-start-1 xl:[&:nth-child(2)]:col-start-3 xl:[&:nth-child(2)]:row-start-1" :aria-label="`${sideLabel}记分`">
    <p v-if="team.name !== sideLabel" class="m-0 text-[13px] text-body">{{ sideLabel }}</p>
    <h3 class="mx-0 mt-0.5 mb-0 text-[16px] leading-tight wrap-anywhere text-ink compact:text-[20px]">{{ team.name }}</h3>
    <div class="px-0 py-1 text-[48px] leading-[1.2] font-bold tracking-[-.02em] text-ink tabular-nums compact:text-[64px]" :aria-label="`${team.name}比分 ${team.score}`">{{ team.score }}</div>
    <div class="grid grid-cols-3 gap-1 xs:gap-2">
      <n-button v-for="(stat, index) in (['ftMade', 'twoMade', 'threeMade'] as const)" :key="stat" secondary :theme-overrides="refereeControlThemes.compactButton" :aria-label="`${team.name}加${index + 1}分`" @click="emit('stat', side, stat)">+{{ index + 1 }}</n-button>
    </div>
    <div class="mt-3 border-0 border-t border-solid border-line pt-3 text-body">
      <p class="m-0 text-[14px]">本节犯规 <strong class="ml-1 text-[20px] text-ink tabular-nums">{{ fouls }}</strong></p>
      <div class="mt-2 grid grid-cols-2 gap-1 xs:gap-2">
        <n-button secondary :theme-overrides="refereeControlThemes.compactButton" :disabled="fouls === 0" :aria-label="`${team.name}减少犯规`" @click="emit('foul', side, -1)"><Minus class="size-5" aria-hidden="true" /></n-button>
        <n-button secondary :theme-overrides="refereeControlThemes.compactButton" :aria-label="`${team.name}记录犯规`" @click="emit('foul', side, 1)"><Plus class="size-5" aria-hidden="true" /></n-button>
      </div>
      <p v-if="fouls >= limit" class="mt-2 mb-0 text-[14px] leading-[1.5] text-red-hover" role="status">已达犯规提示阈值，请核对适用罚则。</p>
    </div>
    <div class="mt-3 grid gap-2 text-body">
      <p class="m-0 text-[14px]">剩余暂停 <strong class="ml-1 text-[20px] text-ink tabular-nums">{{ team.timeoutsLeft }}</strong></p>
      <n-button secondary block :theme-overrides="refereeControlThemes.compactButton" :disabled="timeoutActive || team.timeoutsLeft === 0" :aria-label="`${team.name}请求暂停`" @click="emit('timeout', side)">请求暂停</n-button>
    </div>
    <div class="mt-3">
      <n-button block :theme-overrides="refereeControlThemes.compactButton" :type="possession ? 'primary' : 'default'" :aria-pressed="possession" :aria-label="`${team.name}交替拥有`" @click="emit('possession', side)">
        <ArrowLeft v-if="possession && side === 'home'" class="mr-1 size-4" aria-hidden="true" />交替拥有<ArrowRight v-if="possession && side === 'away'" class="ml-1 size-4" aria-hidden="true" />
      </n-button>
    </div>
    <details class="group mt-3 border-0 border-t border-solid border-line pt-1 text-body">
      <summary class="flex min-h-11 cursor-pointer list-none items-center justify-between text-[14px] [&::-webkit-details-marker]:hidden">
        队伍修正<ChevronDown class="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div class="grid gap-3 pb-1">
        <form class="grid gap-2" @submit.prevent="emit('rename', side, name)">
          <n-input v-model:value="name" :maxlength="40" :input-props="{ 'aria-label': `${sideLabel}队名` }" />
          <n-button secondary attr-type="submit">保存队名</n-button>
        </form>
        <div class="grid grid-cols-2 gap-1 xs:gap-2">
          <n-button quaternary :theme-overrides="refereeControlThemes.compactButton" :disabled="periodScore === 0" :aria-label="`${team.name}本节比分减 1 纠错`" @click="emit('correct', side, -1)">−1 纠错</n-button>
          <n-button quaternary :theme-overrides="refereeControlThemes.compactButton" :aria-label="`${team.name}本节比分加 1 纠错`" @click="emit('correct', side, 1)">+1 纠错</n-button>
        </div>
        <n-button quaternary block :aria-label="`恢复${team.name}一次暂停`" @click="emit('restore', side)">恢复一次暂停</n-button>
      </div>
    </details>
  </section>
</template>
