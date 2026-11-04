<script setup lang="ts">
import { Menu, X } from '@lucide/vue'
import { NDrawer } from 'naive-ui'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { BoardId } from '../../../content/threads.sample'
import { boardTabs } from '../home.presentation'
import ForumBoardMenu from './ForumBoardMenu.vue'

defineProps<{ board: BoardId | 'all' }>()
const emit = defineEmits<{ select: [board: BoardId | 'all'] }>()
const open = ref(false)
const trigger = ref<HTMLButtonElement | null>(null)
let observer: ResizeObserver | undefined

function restoreFocus() {
  if (trigger.value?.getClientRects().length) trigger.value.focus({ preventScroll: true })
  else trigger.value?.parentElement?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')?.focus({ preventScroll: true })
}

function select(board: BoardId | 'all') {
  emit('select', board)
  open.value = false
}

onMounted(() => {
  // 以实际可见性跟随统一 CSS 断点，避免额外维护一份断点数值；转桌面时释放遮罩与滚动锁。
  observer = new ResizeObserver(() => {
    if (open.value && !trigger.value?.getClientRects().length) open.value = false
  })
  if (trigger.value) observer.observe(trigger.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div class="min-w-0 lg:sticky lg:top-24">
    <button ref="trigger" type="button" aria-label="选择讨论版块" aria-haspopup="dialog" aria-controls="forum-board-drawer" :aria-expanded="open" class="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl border border-solid border-line bg-soft/80 px-4 py-3 text-left text-sm text-ink transition-all hover:bg-sand active:scale-[.98] lg:hidden" @click="open = true">
      <Menu class="size-5 shrink-0 text-body" aria-hidden="true" />
      <span class="grow font-semibold">{{ boardTabs.find((tab) => tab.id === board)?.title }}</span>
      <span class="text-xs text-body">切换版块</span>
    </button>
    <div class="hidden lg:block"><ForumBoardMenu :board="board" @select="select" /></div>
    <NDrawer id="forum-board-drawer" v-model:show="open" placement="left" width="min(320px, calc(100vw - 48px))" aria-labelledby="forum-board-drawer-title" @after-leave="restoreFocus">
      <div class="flex min-h-full flex-col border-0 border-r border-solid border-line bg-soft/80 px-4 pt-[max(16px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))] backdrop-blur-xl">
        <header class="mb-6 flex items-center justify-between gap-3">
          <h2 id="forum-board-drawer-title" class="m-0 text-lg font-bold text-ink">裁判社区</h2>
          <!-- 显式 tabindex 兼容当前组件库的焦点候选检测，保证打开时优先聚焦关闭按钮。 -->
          <button type="button" tabindex="0" aria-label="关闭版块侧栏" class="flex size-11 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-body transition-all hover:bg-sand active:scale-95" @click="open = false"><X class="size-5" aria-hidden="true" /></button>
        </header>
        <ForumBoardMenu :board="board" @select="select" @navigate="open = false" />
      </div>
    </NDrawer>
  </div>
</template>
