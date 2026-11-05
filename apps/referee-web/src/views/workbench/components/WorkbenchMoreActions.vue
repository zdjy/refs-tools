<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'
import { NButton, NPopconfirm } from 'naive-ui'

defineProps<{ muted: boolean; shortcutsEnabled: boolean }>()
const emit = defineEmits<{
  exportSession: []; resetMatch: []; removeSession: []
  toggleMute: []; whistle: []; buzzer: []; toggleShortcuts: []
}>()
</script>

<template>
  <!-- 低频与破坏性操作收进折叠面板，避免与记分按钮并排误触；用原生 details 保留键盘与读屏语义。 -->
  <details class="group my-3 rounded-xl border border-solid border-line bg-surface">
    <summary class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-4 text-[14px] font-medium text-ink [&::-webkit-details-marker]:hidden">
      更多操作
      <ChevronDown class="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
    </summary>
    <div class="grid gap-4 border-0 border-t border-solid border-line p-4">
      <div class="flex flex-wrap gap-2" role="group" aria-label="声音与快捷键">
        <n-button secondary :aria-pressed="!muted" @click="emit('toggleMute')">{{ muted ? '启用声音' : '静音' }}</n-button>
        <n-button secondary @click="emit('whistle')">哨音</n-button>
        <n-button secondary @click="emit('buzzer')">蜂鸣器</n-button>
        <n-button class="hidden tablet:inline-flex" quaternary :aria-pressed="shortcutsEnabled" @click="emit('toggleShortcuts')">快捷键{{ shortcutsEnabled ? '已开启' : '已关闭' }}</n-button>
      </div>
      <p v-if="shortcutsEnabled" class="m-0 hidden text-[13px] leading-[1.6] text-body tablet:block">Space 启停比赛钟 · R/T 重置进攻钟 · P 球权 · H 蜂鸣 · Ctrl/Cmd+Z 撤销。输入或弹窗中不生效。</p>
      <div class="flex flex-wrap gap-2" role="group" aria-label="导出与重置">
        <n-button secondary @click="emit('exportSession')">导出会话 JSON</n-button>
        <n-popconfirm positive-text="重置整场" negative-text="取消" @positive-click="emit('resetMatch')">
          <template #trigger><n-button quaternary>重置整场</n-button></template>
          重置比分、统计、犯规、暂停、节次和日志？队名与规则保留，建议先导出。
        </n-popconfirm>
        <n-popconfirm positive-text="删除" negative-text="取消" @positive-click="emit('removeSession')">
          <template #trigger><n-button quaternary>删除这场比赛</n-button></template>
          删除这场本地比赛？请先导出需要保留的记录。
        </n-popconfirm>
      </div>
    </div>
  </details>
</template>
