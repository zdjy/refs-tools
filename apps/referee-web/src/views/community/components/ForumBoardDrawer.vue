<script setup lang="ts">
import { ChevronRight, X } from '@lucide/vue'
import { NDrawer } from 'naive-ui'
import type { BoardId } from '../../../content/threads.sample'
import { boardCounts, boardTabs } from '../community.presentation'
import { boardIcons } from './board-icons'

defineProps<{ board: BoardId | 'all'; open: boolean }>()
const emit = defineEmits<{ select: [board: BoardId | 'all']; 'update:open': [open: boolean]; closed: [] }>()
const counts = boardCounts()
</script>

<template>
  <!-- 手机端版块抽屉：从左侧滑入，列表项按序浮入；选中版块用沙金底、加粗与 aria-current 表达。 -->
  <NDrawer id="forum-board-drawer" :show="open" placement="left" width="min(320px, calc(100vw - 56px))" aria-labelledby="forum-board-drawer-title" @update:show="emit('update:open', $event)" @after-leave="emit('closed')">
    <div class="flex min-h-full flex-col bg-canvas pt-[max(16px,env(safe-area-inset-top))] pb-[max(20px,env(safe-area-inset-bottom))]">
      <header class="flex items-center justify-between gap-3 border-0 border-b border-solid border-line px-4 pb-4">
        <div class="min-w-0">
          <h2 id="forum-board-drawer-title" class="m-0 text-[20px] leading-tight font-bold tracking-[-0.02em] text-ink">讨论版块</h2>
          <p class="mt-1 mb-0 text-[13px] text-body">共 <span class="font-mono">{{ counts.all }}</span> 则示例讨论</p>
        </div>
        <!-- 显式 tabindex 兼容当前组件库的焦点候选检测，保证打开时优先聚焦关闭按钮。 -->
        <button type="button" tabindex="0" aria-label="关闭版块抽屉" class="flex size-11 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-body transition-all duration-200 hover:bg-sand active:scale-90" @click="emit('update:open', false)"><X class="size-5" aria-hidden="true" /></button>
      </header>
      <nav aria-label="选择讨论版块" class="min-h-0 grow overflow-y-auto px-2 py-3">
        <button v-for="(tab, index) in boardTabs" :key="tab.id" type="button" :aria-current="board === tab.id ? 'true' : undefined" :style="{ animationDelay: `${index * 45}ms` }" class="flex min-h-14 w-full animate-rise cursor-pointer items-center gap-3 rounded-xl border-0 px-3 text-left transition-colors duration-200 active:scale-[.98]" :class="board === tab.id ? 'bg-sand font-semibold text-ink' : 'bg-transparent font-medium text-body hover:bg-soft hover:text-ink'" @click="emit('select', tab.id)">
          <component :is="boardIcons[tab.id]" class="size-5 shrink-0" :stroke-width="1.5" aria-hidden="true" />
          <span class="min-w-0 grow"><span class="block text-[16px]">{{ tab.title }}</span><span class="mt-0.5 block text-[13px] leading-[1.5] font-normal text-body">{{ tab.hint }}</span></span>
          <span class="font-mono text-[13px]">{{ counts[tab.id] }}</span>
          <ChevronRight class="size-4 shrink-0 text-muted" :stroke-width="2" aria-hidden="true" />
        </button>
      </nav>
      <p class="m-0 border-0 border-t border-solid border-line px-4 pt-4 text-[13px] leading-[1.7] text-body">从事实出发，核对适用规则，尊重不同视角。</p>
    </div>
  </NDrawer>
</template>
