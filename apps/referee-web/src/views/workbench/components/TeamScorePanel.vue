<script setup lang="ts">
import { ref, watch } from 'vue'
import { NButton, NCard, NInput } from 'naive-ui'
import type { TeamRecord, TeamSide, TeamStat } from '../../../domain/scorer'
const props = defineProps<{ team: TeamRecord; side: TeamSide; fouls: number; limit: number; possession: boolean; timeoutActive: boolean; periodScore: number }>()
const emit = defineEmits<{
  stat: [side: TeamSide, stat: TeamStat]; correct: [side: TeamSide, delta: number]
  foul: [side: TeamSide, delta: number]; timeout: [side: TeamSide]; restore: [side: TeamSide]
  rename: [side: TeamSide, name: string]; possession: [side: TeamSide]
}>()
const editing = ref(false)
const name = ref(props.team.name)
watch(() => props.team.name, (value) => { name.value = value; editing.value = false })
</script>

<template>
  <n-card class="team-score-panel">
    <header class="team-score-heading">
      <span class="section-note">{{ side === 'home' ? '主队' : '客队' }}</span>
      <n-button quaternary :aria-label="`修改${side === 'home' ? '主队' : '客队'}队名`" @click="editing = !editing">改队名</n-button>
    </header>
    <form v-if="editing" class="team-name-form" @submit.prevent="emit('rename', side, name)">
      <n-input v-model:value="name" :maxlength="40" :input-props="{ 'aria-label': '新队名' }" />
      <n-button secondary attr-type="submit">保存</n-button>
    </form>
    <h3 v-else class="score-team-name">{{ team.name }}</h3>
    <div class="team-score-value" :aria-label="`${team.name}比分 ${team.score}`">{{ team.score }}</div>
    <div class="score-action-row">
      <n-button v-for="(stat, index) in (['ftMade', 'twoMade', 'threeMade'] as const)" :key="stat" secondary :aria-label="`${team.name}加${index + 1}分`" @click="emit('stat', side, stat)">+{{ index + 1 }}</n-button>
    </div>
    <div class="score-action-row">
      <n-button quaternary :disabled="periodScore === 0" @click="emit('correct', side, -1)">−1 纠错</n-button>
      <n-button quaternary @click="emit('correct', side, 1)">+1 纠错</n-button>
    </div>
    <div class="team-foul-row">
      <span>本节犯规 <strong>{{ fouls }}</strong></span>
      <div class="score-action-row">
        <n-button secondary :disabled="fouls === 0" :aria-label="`${team.name}减少犯规`" @click="emit('foul', side, -1)">−</n-button>
        <n-button secondary :aria-label="`${team.name}记录犯规`" @click="emit('foul', side, 1)">+</n-button>
      </div>
    </div>
    <p v-if="fouls >= limit" class="foul-warning">已达犯规提示阈值，请核对适用罚则。</p>
    <div class="team-timeouts">
      <span>本节剩余暂停 <strong>{{ team.timeoutsLeft }}</strong></span>
      <div class="score-action-row">
        <n-button secondary :disabled="timeoutActive || team.timeoutsLeft === 0" :aria-label="`${team.name}请求暂停`" @click="emit('timeout', side)">请求暂停</n-button>
        <n-button quaternary :aria-label="`恢复${team.name}一次暂停`" @click="emit('restore', side)">恢复</n-button>
      </div>
    </div>
    <n-button class="possession-button" :type="possession ? 'primary' : 'default'" :aria-pressed="possession" @click="emit('possession', side)">
      {{ possession ? (side === 'home' ? '← 交替拥有' : '交替拥有 →') : '设为交替拥有' }}
    </n-button>
  </n-card>
</template>
