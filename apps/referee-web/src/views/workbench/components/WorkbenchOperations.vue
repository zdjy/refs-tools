<script setup lang="ts">
import { NButton, NCard } from 'naive-ui'
import type { FoulCount } from '../../../domain/workbench'

defineProps<{ fouls: FoulCount; presets: number[] }>()
const emit = defineEmits<{ foul: [team: keyof FoulCount]; preset: [seconds: number] }>()
const teams = [{ key: 'home', label: '主队' }, { key: 'away', label: '客队' }] as const
</script>

<template>
  <div class="mt-3 grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-2">
    <n-card class="min-w-0">
      <div class="flex items-center justify-between gap-2"><h3 class="m-0 text-[16px] text-ink">球队犯规</h3><span class="text-[13px] text-body">本节</span></div>
      <div class="mt-4 grid gap-2">
        <div v-for="team in teams" :key="team.key" class="flex min-h-14 items-center justify-between gap-2 border-0 border-t border-solid border-line px-0 py-1.5">
          <div class="flex items-center gap-3"><span class="text-[14px] text-body">{{ team.label }}</span><span class="min-w-7 text-[24px] text-ink tabular-nums">{{ fouls[team.key] }}</span></div>
          <n-button secondary :aria-label="`记录${team.label}犯规`" @click="emit('foul', team.key)">+ 记录犯规</n-button>
        </div>
      </div>
    </n-card>
    <n-card class="min-w-0">
      <div class="flex items-center justify-between gap-2"><h3>进攻计时</h3></div>
      <p class="mt-4 mr-0 mb-3 ml-0 text-[13px] text-body">快速重置 · 以当前配置为准</p>
      <div class="flex flex-wrap gap-2">
        <n-button v-for="seconds in presets" :key="seconds" secondary class="min-w-16" @click="emit('preset', seconds)">
          <span class="text-[17px]">{{ seconds }} 秒</span>
        </n-button>
      </div>
      <p class="mt-3.5 mr-0 mb-0 ml-0 text-[13px] leading-[1.6] text-body">计时提示不替代裁判对比赛规则的最终判断。</p>
    </n-card>
  </div>
</template>
