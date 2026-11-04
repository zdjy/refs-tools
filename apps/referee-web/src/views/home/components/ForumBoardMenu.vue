<script setup lang="ts">
import { ClipboardList, Layers, MessageSquare, NotebookPen, ScanLine, Sprout } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import type { BoardId } from '../../../content/threads.sample'
import { modules } from '../../../navigation/modules'
import { boardTabs } from '../home.presentation'

defineProps<{ board: BoardId | 'all' }>()
defineEmits<{ select: [board: BoardId | 'all']; navigate: [] }>()
const icons = { all: Layers, 'case-review': ScanLine, 'field-notes': NotebookPen, 'table-work': ClipboardList, 'rookie-notes': Sprout }
</script>

<template>
  <nav aria-label="论坛版块" class="min-w-0">
    <h2 class="mt-0 mb-3 px-3 text-xs font-semibold text-body">讨论版块</h2>
    <div class="flex flex-col gap-2 p-1" role="group" aria-label="按版块筛选讨论">
      <button v-for="tab in boardTabs" :key="tab.id" type="button" tabindex="0" :aria-pressed="board === tab.id" aria-controls="thread-list" class="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl border-0 px-3 py-3 text-left text-sm transition-all active:scale-95" :class="board === tab.id ? 'bg-sand font-semibold text-ink shadow-selected' : 'bg-transparent font-medium text-body hover:bg-soft hover:text-ink'" @click="$emit('select', tab.id)">
        <component :is="icons[tab.id]" class="size-4 shrink-0" :class="board === tab.id ? 'text-red' : ''" aria-hidden="true" />{{ tab.title }}
      </button>
    </div>
    <div class="mt-6 border-0 border-t border-solid border-line px-3 pt-5">
      <p class="m-0 text-xs leading-relaxed text-body">从事实出发，核对适用规则，尊重不同视角。</p>
      <RouterLink :to="modules.forum.path" class="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full text-xs font-medium text-body no-underline transition-all hover:text-red-hover active:scale-95" @click="$emit('navigate')"><MessageSquare class="size-4" aria-hidden="true" />论坛建设进展</RouterLink>
    </div>
  </nav>
</template>
