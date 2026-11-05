<script setup lang="ts">
import { computed, ref } from 'vue'
import { refereeControlThemes } from '../../../ui-theme'
import { NButton } from 'naive-ui'
import { STAT_LABELS, type ScorerState, type TeamSide, type TeamStat } from '../../../domain/scorer'
const props = defineProps<{ scorer: ScorerState }>()
const emit = defineEmits<{ stat: [side: TeamSide, stat: TeamStat] }>()
const selected = ref<TeamSide>('home')
const team = computed(() => props.scorer.teams[selected.value])
const stats = Object.keys(STAT_LABELS) as TeamStat[]
</script>

<template>
  <section class="mt-6 border-0 border-t border-solid border-line pt-5">
    <div class="flex flex-wrap items-center justify-between gap-2"><h3 class="m-0 text-[16px] text-ink">队伍技术统计</h3><span class="text-[13px] text-body">只记队伍，不记个人</span></div>
    <div class="mt-4 mr-0 mb-0 ml-0 flex flex-wrap gap-2" aria-label="选择统计队伍">
      <n-button class="min-h-11 max-w-full" :theme-overrides="refereeControlThemes.wrappingButton" v-for="side in (['home', 'away'] as const)" :key="side" :type="selected === side ? 'primary' : 'default'" :aria-pressed="selected === side" @click="selected = side"><span class="whitespace-normal wrap-anywhere">{{ scorer.teams[side].name }}</span></n-button>
    </div>
    <p class="mt-3.5 mr-0 mb-0 ml-0 text-[13px] leading-[1.6] wrap-anywhere text-body">当前录入：{{ team.name }}。命中自动计分；技术犯规不自动判罚。</p>
    <div class="mt-3 grid grid-cols-[minmax(0,1fr)] gap-2 xs:grid-cols-2 compact:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      <n-button v-for="stat in stats" :key="stat" secondary :theme-overrides="refereeControlThemes.wrappingButton" :aria-label="`${team.name}记录${STAT_LABELS[stat]}`" @click="emit('stat', selected, stat)"><span class="whitespace-normal wrap-anywhere">{{ STAT_LABELS[stat] }} <span class="ml-2 font-bold tabular-nums">{{ team.stats[stat] }}</span></span></n-button>
    </div>
  </section>
</template>
