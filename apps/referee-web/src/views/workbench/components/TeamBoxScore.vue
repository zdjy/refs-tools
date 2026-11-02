<script setup lang="ts">
import { NButton, NModal } from 'naive-ui'
import { refereeModalStyle } from '../../../ui-theme'
import type { WorkbenchSession } from '../../../domain/workbench'
import { STAT_LABELS, type TeamStat } from '../../../domain/scorer'
import { shootingSummary } from '../scorer-export'
defineProps<{ show: boolean; session: WorkbenchSession }>()
const emit = defineEmits<{ 'update:show': [show: boolean]; csv: []; json: [] }>()
const stats = Object.keys(STAT_LABELS) as TeamStat[]
</script>

<template>
  <n-modal :show="show" preset="card" title="球队技术统计" class="max-w-[800px] max-h-[90dvh] overflow-y-auto" :style="refereeModalStyle" :closable="false" @update:show="emit('update:show', $event)">
    <p class="mt-0 mr-0 mb-5 ml-0 text-[14px] leading-[1.6] text-body">本机辅助记录，不是官方统计表。比分纠错不改变投篮统计。</p>
    <div class="grid grid-cols-[minmax(0,1fr)] gap-6 sm:grid-cols-2">
      <section v-for="side in (['home', 'away'] as const)" :key="side" class="min-w-0 wrap-anywhere">
        <h3 class="mt-0 mr-0 mb-3 ml-0">{{ session.scorer.teams[side].name }} · {{ session.scorer.teams[side].score }} 分</h3>
        <dl class="m-0">
          <div class="flex justify-between gap-3 border-0 border-t border-solid border-line px-0 py-2 text-[13px]"><dt class="text-body">分节比分</dt><dd class="m-0 text-right wrap-anywhere tabular-nums">{{ Array.from({ length: session.period }, (_, i) => session.scorer.teams[side].periodScores[i] ?? 0).join(' / ') }}</dd></div>
          <div class="flex justify-between gap-3 border-0 border-t border-solid border-line px-0 py-2 text-[13px]"><dt class="text-body">投篮（两分+三分）</dt><dd class="m-0 text-right wrap-anywhere tabular-nums">{{ shootingSummary(session.scorer.teams[side]).field }}</dd></div>
          <div class="flex justify-between gap-3 border-0 border-t border-solid border-line px-0 py-2 text-[13px]"><dt class="text-body">三分</dt><dd class="m-0 text-right wrap-anywhere tabular-nums">{{ shootingSummary(session.scorer.teams[side]).three }}</dd></div>
          <div class="flex justify-between gap-3 border-0 border-t border-solid border-line px-0 py-2 text-[13px]"><dt class="text-body">罚球</dt><dd class="m-0 text-right wrap-anywhere tabular-nums">{{ shootingSummary(session.scorer.teams[side]).free }}</dd></div>
          <div class="flex justify-between gap-3 border-0 border-t border-solid border-line px-0 py-2 text-[13px]" v-for="stat in stats" :key="stat"><dt class="text-body">{{ STAT_LABELS[stat] }}</dt><dd class="m-0 text-right wrap-anywhere tabular-nums">{{ session.scorer.teams[side].stats[stat] }}</dd></div>
        </dl>
      </section>
    </div>
    <template #footer><div class="flex flex-wrap justify-end gap-2">
      <n-button secondary @click="emit('csv')">导出统计 CSV</n-button>
      <n-button secondary @click="emit('json')">会话 JSON</n-button>
      <n-button type="primary" @click="emit('update:show', false)">关闭</n-button>
    </div></template>
  </n-modal>
</template>
