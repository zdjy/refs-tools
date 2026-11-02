<script setup lang="ts">
import { NButton, NModal } from 'naive-ui'
import type { WorkbenchSession } from '../../../domain/workbench'
import { STAT_LABELS, type TeamStat } from '../../../domain/scorer'
import { shootingSummary } from '../scorer-export'
defineProps<{ show: boolean; session: WorkbenchSession }>()
const emit = defineEmits<{ 'update:show': [show: boolean]; csv: []; json: [] }>()
const stats = Object.keys(STAT_LABELS) as TeamStat[]
</script>

<template>
  <n-modal :show="show" preset="card" title="球队技术统计" class="boxscore-dialog" :closable="false" @update:show="emit('update:show', $event)">
    <p class="dialog-copy">本机辅助记录，不是官方统计表。比分纠错不改变投篮统计。</p>
    <div class="boxscore-teams">
      <section v-for="side in (['home', 'away'] as const)" :key="side" class="boxscore-team">
        <h3>{{ session.scorer.teams[side].name }} · {{ session.scorer.teams[side].score }} 分</h3>
        <dl class="boxscore-list">
          <div><dt>分节比分</dt><dd>{{ Array.from({ length: session.period }, (_, i) => session.scorer.teams[side].periodScores[i] ?? 0).join(' / ') }}</dd></div>
          <div><dt>投篮（两分+三分）</dt><dd>{{ shootingSummary(session.scorer.teams[side]).field }}</dd></div>
          <div><dt>三分</dt><dd>{{ shootingSummary(session.scorer.teams[side]).three }}</dd></div>
          <div><dt>罚球</dt><dd>{{ shootingSummary(session.scorer.teams[side]).free }}</dd></div>
          <div v-for="stat in stats" :key="stat"><dt>{{ STAT_LABELS[stat] }}</dt><dd>{{ session.scorer.teams[side].stats[stat] }}</dd></div>
        </dl>
      </section>
    </div>
    <template #footer><div class="dialog-footer">
      <n-button secondary @click="emit('csv')">导出统计 CSV</n-button>
      <n-button secondary @click="emit('json')">会话 JSON</n-button>
      <n-button type="primary" @click="emit('update:show', false)">关闭</n-button>
    </div></template>
  </n-modal>
</template>
