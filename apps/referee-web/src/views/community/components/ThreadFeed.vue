<script setup lang="ts">
import { Info, Search, SearchX } from '@lucide/vue'
import { computed } from 'vue'
import { boardTabs } from '../community.presentation'
import { useThreadFeed } from '../useThreadFeed'
import ForumBoardPicker from './ForumBoardPicker.vue'
import ForumBoards from './ForumBoards.vue'
import ThreadCard from './ThreadCard.vue'

const { board, query, threads, expanded, toggle, reset } = useThreadFeed()
// 手机端只有三条横线入口，当前版块名由结果计数行承担，避免版块背景不可见。
const boardTitle = computed(() => boardTabs.find((tab) => tab.id === board.value)?.title ?? '全部讨论')
</script>

<template>
  <section class="min-w-0" aria-labelledby="forum-title">
    <h2 id="forum-title" class="sr-only">{{ boardTitle }}</h2>
    <ForumBoards :board="board" @select="board = $event" />
    <!-- 工具行：左侧是结果计数，右侧是搜索栏；窄屏上下堆叠，版块入口与搜索栏同处一行。 -->
    <div class="flex flex-col gap-3 pt-4 pb-3 compact:flex-row compact:items-center compact:justify-between">
      <p class="m-0 text-[13px] text-body" role="status" aria-live="polite" aria-atomic="true">{{ query.trim() ? '搜索结果' : boardTitle }} · <span class="font-mono">{{ threads.length }}</span> 则示例</p>
      <div class="flex min-w-0 items-center gap-2 compact:w-[280px]">
        <ForumBoardPicker :board="board" @select="board = $event" />
        <label for="thread-search" class="sr-only">搜索讨论示例</label>
        <div class="flex min-w-0 grow items-center gap-2 rounded-[10px] border border-solid border-line bg-soft px-3 transition-shadow duration-200 focus-within:border-accent/40 focus-within:ring-2 focus-within:ring-accent/30">
          <Search class="size-4 shrink-0 text-body" aria-hidden="true" />
          <input id="thread-search" v-model="query" type="search" maxlength="100" placeholder="搜索话题、关键词" aria-controls="thread-list" class="min-h-11 w-full min-w-0 border-0 bg-transparent text-base text-ink outline-none placeholder:text-muted" />
        </div>
      </div>
    </div>
    <!-- 示例声明放在列表上方，用左侧一条细线标出，不再混在计数文字后面。 -->
    <p class="mt-0 mb-3 flex items-start gap-2 border-0 border-l border-solid border-ink py-0.5 pl-3 text-[13px] leading-[1.6] text-ink"><Info class="mt-0.5 size-4 shrink-0" :stroke-width="1.75" aria-hidden="true" />自编情境与示例角色，非真实用户帖子；发帖、回复与点赞尚未开放。</p>
    <div id="thread-list" class="border-0 border-t border-solid border-ink">
      <ThreadCard v-for="(thread, index) in threads" :key="thread.id" :index="index" :thread="thread" :open="expanded.has(thread.id)" @toggle="toggle" />
      <div v-if="!threads.length" class="px-5 py-12 text-center">
        <SearchX class="mx-auto size-7 text-body" aria-hidden="true" />
        <h3 class="mt-4 mb-2 text-base font-semibold text-ink">没有匹配的讨论</h3>
        <p class="m-0 text-sm leading-[1.7] text-body">试试其他关键词，或返回全部讨论。</p>
        <button type="button" class="mt-5 min-h-11 cursor-pointer rounded-full border-0 bg-ink px-5 text-sm font-medium text-surface transition-all duration-200 ease-(--ease-ios) hover:bg-black active:scale-95" @click="reset">重置筛选</button>
      </div>
    </div>
    <p class="mt-3 mb-0 text-[13px] text-body">{{ threads.length ? '已展示全部匹配示例' : '仅搜索当前版块的内置讨论示例' }}</p>
  </section>
</template>
