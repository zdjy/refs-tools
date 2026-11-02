<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton, NCard } from 'naive-ui'
import { STAT_LABELS, type ScorerState, type TeamSide, type TeamStat } from '../../../domain/scorer'
const props = defineProps<{ scorer: ScorerState }>()
const emit = defineEmits<{ stat: [side: TeamSide, stat: TeamStat] }>()
const selected = ref<TeamSide>('home')
const team = computed(() => props.scorer.teams[selected.value])
const stats = Object.keys(STAT_LABELS) as TeamStat[]
</script>

<template>
  <n-card class="event-section">
    <div class="section-heading"><h3>队伍技术统计</h3><span class="section-note">只记队伍，不记个人</span></div>
    <div class="team-stat-selector" aria-label="选择统计队伍">
      <n-button v-for="side in (['home', 'away'] as const)" :key="side" :type="selected === side ? 'primary' : 'default'" :aria-pressed="selected === side" @click="selected = side"><span class="team-selector-name">{{ scorer.teams[side].name }}</span></n-button>
    </div>
    <p class="rules-note">当前录入：{{ team.name }}。命中自动计分；技术犯规不自动判罚。</p>
    <div class="team-stat-grid">
      <n-button v-for="stat in stats" :key="stat" secondary :aria-label="`${team.name}记录${STAT_LABELS[stat]}`" @click="emit('stat', selected, stat)">{{ STAT_LABELS[stat] }} <span class="stat-count">{{ team.stats[stat] }}</span></n-button>
    </div>
  </n-card>
</template>
