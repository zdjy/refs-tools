<script setup lang="ts">
import { NButton, NCard } from 'naive-ui'
import type { FoulCount } from '../../../domain/workbench'

defineProps<{ fouls: FoulCount; presets: number[] }>()
const emit = defineEmits<{ foul: [team: keyof FoulCount]; preset: [seconds: number] }>()
const teams = [{ key: 'home', label: '主队' }, { key: 'away', label: '客队' }] as const
</script>

<template>
  <div class="operations-grid">
    <n-card class="operation-section">
      <div class="section-heading"><h3>球队犯规</h3><span class="section-note">本节</span></div>
      <div class="foul-teams">
        <div v-for="team in teams" :key="team.key" class="team-row">
          <div><span class="team-name">{{ team.label }}</span><span class="foul-total">{{ fouls[team.key] }}</span></div>
          <n-button secondary :aria-label="`记录${team.label}犯规`" @click="emit('foul', team.key)">+ 记录犯规</n-button>
        </div>
      </div>
    </n-card>
    <n-card class="operation-section">
      <div class="section-heading"><h3>进攻计时</h3></div>
      <p class="shot-caption">快速重置 · 以当前配置为准</p>
      <div class="preset-row">
        <n-button v-for="seconds in presets" :key="seconds" secondary class="preset-button" @click="emit('preset', seconds)">
          {{ seconds }} 秒
        </n-button>
      </div>
      <p class="rules-note">计时提示不替代裁判对比赛规则的最终判断。</p>
    </n-card>
  </div>
</template>
