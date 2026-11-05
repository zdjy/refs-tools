<script setup lang="ts">
import { refereeControlThemes } from '../../../ui-theme'
import { Plus } from '@lucide/vue'
import { NButton, NPopconfirm } from 'naive-ui'
import type { WorkbenchSession } from '../../../domain/workbench'
import { formatDate } from '../workbench.presentation'

defineProps<{ sessions: WorkbenchSession[]; activeId: string; disabled: boolean; canClear: boolean }>()
const emit = defineEmits<{ create: []; select: [id: string]; clear: [] }>()
</script>

<template>
  <aside class="flex min-w-0 flex-col border-0 border-b border-solid border-line bg-soft/80 p-4 backdrop-blur-xl tablet:border-r tablet:border-b-0 tablet:px-4 tablet:py-6" aria-label="比赛会话列表">
    <div class="flex items-center justify-between">
      <h1 class="m-0 text-[18px]">比赛</h1>
      <n-button quaternary circle class="size-11" :theme-overrides="refereeControlThemes.iconButton" aria-label="新建比赛" :disabled="disabled" @click="emit('create')"><Plus class="size-5" aria-hidden="true" /></n-button>
    </div>
    <p class="mt-1 mr-0 mb-3 ml-0 text-[13px] text-body">仅保存在这台设备</p>
    <ul v-if="sessions.length" class="m-0 flex list-none gap-2 overflow-x-auto px-0 pt-0 pb-1 tablet:grid tablet:grid-cols-[minmax(0,1fr)] tablet:overflow-visible">
      <li v-for="session in sessions" :key="session.id" class="min-w-0 basis-[180px] shrink-0 grow-0 rounded-xl" :class="activeId === session.id ? 'bg-sand shadow-selected' : ''">
        <n-button quaternary block :theme-overrides="refereeControlThemes.sessionButton" :aria-pressed="activeId === session.id" @click="emit('select', session.id)">
          <span class="grid min-w-0 justify-items-start gap-1 whitespace-normal wrap-anywhere">
            <span class="text-[14px] font-[650]">{{ session.title }}</span>
            <span class="text-[13px] text-body">{{ formatDate(session.createdAt) }} · 第 {{ session.period }} 节</span>
          </span>
        </n-button>
      </li>
    </ul>
    <div class="mt-3 rounded-xl bg-sand p-3.5 tablet:mt-auto">
      <p class="mt-0 mr-0 mb-1.5 ml-0 text-[13px] font-bold">共享设备提示</p>
      <p class="m-0 text-[13px] leading-[1.6] text-body">赛后请导出需要保留的记录，并清除此设备中的比赛数据。</p>
      <n-popconfirm positive-text="清空" negative-text="取消" @positive-click="emit('clear')">
        <template #trigger><n-button class="mt-2" quaternary :disabled="!canClear">清空本设备全部比赛</n-button></template>
        清空本设备的全部比赛会话？此操作无法撤销，请先导出需要保留的记录。
      </n-popconfirm>
    </div>
  </aside>
</template>
