<script setup lang="ts">
import { ChevronRight } from '@lucide/vue'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { BoardId } from '../../../content/threads.sample'
import { boardCounts, boardTabs } from '../community.presentation'
import { boardIcons } from './board-icons'
import ForumBoardDrawer from './ForumBoardDrawer.vue'

defineProps<{ board: BoardId | 'all' }>()
const emit = defineEmits<{ select: [board: BoardId | 'all'] }>()
const open = ref(false)
const trigger = ref<HTMLButtonElement | null>(null)
const counts = boardCounts()
let observer: ResizeObserver | undefined

function choose(board: BoardId | 'all') {
  emit('select', board)
  open.value = false
}

// 抽屉关闭后把焦点还给触发按钮；若已切到桌面布局（触发行被隐藏），则落到当前选中的胶囊。
function restoreFocus() {
  if (trigger.value?.getClientRects().length) trigger.value.focus({ preventScroll: true })
  else document.querySelector<HTMLButtonElement>('[aria-controls="thread-list"][aria-pressed="true"]')?.focus({ preventScroll: true })
}

onMounted(() => {
  // 以触发行是否可见跟随统一断点，避免再维护一份断点数值；转桌面时释放遮罩与滚动锁。
  observer = new ResizeObserver(() => { if (open.value && !trigger.value?.getClientRects().length) open.value = false })
  if (trigger.value) observer.observe(trigger.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <nav aria-label="论坛版块" class="min-w-0">
    <!-- 手机：一行触发按钮，点开左侧抽屉选版块。 -->
    <button ref="trigger" type="button" aria-haspopup="dialog" aria-controls="forum-board-drawer" :aria-expanded="open" class="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl border border-solid border-line bg-surface/70 px-3 text-left transition-colors duration-200 hover:bg-surface active:scale-[.98] tablet:hidden" @click="open = true">
      <component :is="boardIcons[board]" class="size-5 shrink-0 text-body" :stroke-width="1.5" aria-hidden="true" />
      <span class="min-w-0 grow"><span class="block text-[13px] text-body">当前版块</span><span class="block text-[16px] leading-snug font-semibold text-ink">{{ boardTabs.find((tab) => tab.id === board)?.title }}</span></span>
      <span class="font-mono text-[13px] text-body">{{ counts[board] }}</span>
      <span class="inline-flex items-center gap-0.5 text-sm font-medium text-accent-hover">切换<ChevronRight class="size-4" :stroke-width="2" aria-hidden="true" /></span>
    </button>
    <!-- 平板及以上：横向胶囊筛选；选中态由深色填充、加粗与 aria-pressed 共同表达。 -->
    <div class="hidden flex-wrap gap-2 py-1 tablet:flex" role="group" aria-label="按版块筛选讨论">
      <button v-for="tab in boardTabs" :key="tab.id" type="button" :aria-pressed="board === tab.id" aria-controls="thread-list" class="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full px-4 text-[15px] whitespace-nowrap transition-all duration-300 ease-(--ease-ios) active:scale-95" :class="board === tab.id ? 'border border-solid border-ink bg-ink font-semibold text-surface' : 'border border-solid border-line bg-surface/70 font-medium text-body hover:bg-sand hover:text-ink'" @click="emit('select', tab.id)">
        <component :is="boardIcons[tab.id]" class="size-4 shrink-0" :stroke-width="1.5" aria-hidden="true" />{{ tab.title }}
      </button>
    </div>
    <ForumBoardDrawer v-model:open="open" :board="board" @select="choose" @closed="restoreFocus" />
  </nav>
</template>
