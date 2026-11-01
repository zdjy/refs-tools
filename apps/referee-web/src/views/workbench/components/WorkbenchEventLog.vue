<script setup lang="ts">
import { NButton, NCard, NEmpty, NPopconfirm } from 'naive-ui'
import type { WorkbenchEvent } from '../../../domain/workbench'
import { formatTime } from '../workbench.presentation'

defineProps<{ events: WorkbenchEvent[] }>()
const emit = defineEmits<{ clear: [] }>()
</script>

<template>
  <n-card class="event-section">
    <div class="section-heading">
      <h3>操作日志</h3>
      <div class="event-actions">
        <span class="event-count">{{ events.length }} 条</span>
        <n-popconfirm v-if="events.length" positive-text="清除" negative-text="取消" @positive-click="emit('clear')">
          <template #trigger><n-button quaternary>清除日志</n-button></template>
          清除当前比赛的操作日志？
        </n-popconfirm>
      </div>
    </div>
    <ol v-if="events.length" class="event-table" aria-label="操作日志">
      <li v-for="event in events" :key="event.id" class="event-row">
        <time :datetime="new Date(event.at).toISOString()">{{ formatTime(event.at) }}</time>
        <strong>{{ event.label }}</strong><span>{{ event.detail ?? '' }}</span>
      </li>
    </ol>
    <n-empty v-else class="empty-events" description="暂无操作记录" :show-icon="false" />
  </n-card>
</template>
