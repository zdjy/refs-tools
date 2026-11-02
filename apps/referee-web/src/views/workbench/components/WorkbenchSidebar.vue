<script setup lang="ts">
import { refereeControlThemes } from '../../../ui-theme'
import { NButton } from 'naive-ui'
import type { WorkbenchSession } from '../../../domain/workbench'
import { formatDate } from '../workbench.presentation'

defineProps<{ sessions: WorkbenchSession[]; activeId: string; disabled: boolean }>()
const emit = defineEmits<{ create: []; select: [id: string] }>()
</script>

<template>
  <aside class="flex min-w-0 flex-col border-0 border-b border-solid border-line p-4 md:border-r md:border-b-0 md:px-4 md:py-6" aria-label="比赛会话列表">
    <div class="flex items-center justify-between">
      <h1 class="m-0 text-[18px]">比赛</h1>
      <n-button quaternary circle class="size-11" :theme-overrides="refereeControlThemes.iconButton" aria-label="新建比赛" :disabled="disabled" @click="emit('create')"><span class="text-[22px]">+</span></n-button>
    </div>
    <p class="mt-1 mr-0 mb-3 ml-0 text-[12px] text-body">仅保存在这台设备</p>
    <ul v-if="sessions.length" class="m-0 flex list-none gap-2 overflow-x-auto px-0 pt-0 pb-1 md:grid md:overflow-visible">
      <li v-for="session in sessions" :key="session.id" class="basis-[180px] shrink-0 grow-0 rounded-full" :class="activeId === session.id ? 'bg-surface shadow-card' : ''">
        <n-button quaternary block :theme-overrides="refereeControlThemes.sessionButton" :aria-pressed="activeId === session.id" @click="emit('select', session.id)">
          <span class="grid justify-items-start gap-1 whitespace-normal">
            <span class="text-[14px] font-[650]">{{ session.title }}</span>
            <span class="text-[12px] text-body">{{ formatDate(session.createdAt) }} · 第 {{ session.period }} 节</span>
          </span>
        </n-button>
      </li>
    </ul>
    <div v-else class="flex items-center gap-3 text-[13px] text-body">
      <p>还没有比赛</p>
      <n-button quaternary :disabled="disabled" @click="emit('create')">创建一场</n-button>
    </div>
    <div class="mt-3 rounded-2xl bg-sand p-3.5 md:mt-auto">
      <p class="mt-0 mr-0 mb-1.5 ml-0 text-[13px] font-bold">共享设备提示</p>
      <span class="text-[12px] leading-[1.6] text-body">赛后请导出需要保留的记录，并清除此设备中的比赛数据。</span>
    </div>
  </aside>
</template>
