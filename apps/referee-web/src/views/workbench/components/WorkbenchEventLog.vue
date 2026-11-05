<script setup lang="ts">
import { NButton, NEmpty, NPopconfirm } from 'naive-ui'
import { cancelButtonProps, confirmButtonProps } from '../../../components/ui/confirm-buttons'
import { formatClock, type WorkbenchEvent } from '../../../domain/workbench'
import { formatTime } from '../workbench.presentation'

defineProps<{ events: WorkbenchEvent[] }>()
const emit = defineEmits<{ clear: [] }>()
</script>

<template>
  <section class="mt-6 border-0 border-t border-solid border-line pt-5">
    <div class="flex items-center justify-between gap-2">
      <h3 class="m-0 text-[16px] text-ink">操作日志</h3>
      <div class="flex items-center gap-2">
        <span class="text-[13px] text-body">{{ events.length }} 条</span>
        <n-popconfirm v-if="events.length" :positive-button-props="confirmButtonProps" :negative-button-props="cancelButtonProps" positive-text="确认清除" negative-text="取消" @positive-click="emit('clear')">
          <template #trigger><n-button quaternary>清除日志</n-button></template>
          清除当前比赛的操作日志？
        </n-popconfirm>
      </div>
    </div>
    <ol v-if="events.length" class="mt-3.5 mr-0 mb-0 ml-0 list-none border-0 border-t border-solid border-line p-0" aria-label="操作日志">
      <li v-for="event in events" :key="event.id" class="grid min-h-11 grid-cols-[72px_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 border-0 border-b border-solid border-line px-0 py-2 text-[13px] wrap-anywhere lg:grid-cols-[78px_minmax(100px,1fr)_minmax(80px,1.3fr)]">
        <time class="text-body tabular-nums" :datetime="new Date(event.at).toISOString()">{{ formatTime(event.at) }}</time>
        <strong class="font-semibold">{{ event.label }}</strong><span class="col-start-2 col-end-auto text-body empty:hidden lg:col-auto"><template v-if="event.period">第 {{ event.period }} 节 · {{ event.gameRemainingMs === undefined ? '' : formatClock(event.gameRemainingMs) }} · {{ event.score }} </template>{{ event.detail ?? '' }}</span>
      </li>
    </ol>
    <n-empty v-else class="px-0 pt-6 pb-2" description="暂无操作记录" :show-icon="false" />
  </section>
</template>
