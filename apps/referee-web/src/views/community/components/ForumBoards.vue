<script setup lang="ts">
import type { BoardId } from '../../../content/threads.sample'
import { boardTabs } from '../community.presentation'
import { boardIcons } from './board-icons'

defineProps<{ board: BoardId | 'all' }>()
const emit = defineEmits<{ select: [board: BoardId | 'all'] }>()
</script>

<template>
  <!-- 平板及以上：横向胶囊筛选；选中态由深色填充、加粗与 aria-pressed 共同表达。手机端的三条横线触发器与抽屉见 ForumBoardPicker。 -->
  <nav aria-label="论坛版块" class="hidden tablet:block">
    <div class="flex flex-wrap gap-2 py-1" role="group" aria-label="按版块筛选讨论">
      <button v-for="tab in boardTabs" :key="tab.id" type="button" :aria-pressed="board === tab.id" aria-controls="thread-list" class="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full px-4 text-[15px] whitespace-nowrap transition-all duration-300 ease-(--ease-ios) active:scale-95" :class="board === tab.id ? 'border border-solid border-ink bg-ink font-semibold text-surface' : 'border border-solid border-line bg-surface/70 font-medium text-body hover:bg-sand hover:text-ink'" @click="emit('select', tab.id)">
        <component :is="boardIcons[tab.id]" class="size-4 shrink-0" :stroke-width="1.5" aria-hidden="true" />{{ tab.title }}
      </button>
    </div>
  </nav>
</template>
