<script setup lang="ts">
import { Search, SearchX } from '@lucide/vue'
import { boardTabs } from '../community.presentation'
import { useThreadFeed } from '../useThreadFeed'
import ForumBoards from './ForumBoards.vue'
import ThreadCard from './ThreadCard.vue'

const { board, query, threads, expanded, toggle, reset } = useThreadFeed()
</script>

<template>
  <section class="grid min-w-0 items-start gap-5 lg:grid-cols-[176px_minmax(0,1fr)] lg:gap-6" aria-labelledby="forum-title">
    <ForumBoards :board="board" @select="board = $event" />
    <div class="min-w-0 overflow-hidden rounded-2xl border border-solid border-line bg-surface shadow-card">
      <header class="border-0 border-b border-solid border-line px-4 pt-5 pb-4 compact:px-6">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 id="forum-title" class="m-0 text-lg font-bold text-ink">{{ boardTabs.find((tab) => tab.id === board)?.title }}</h2>
          <span class="rounded-full bg-soft px-3 py-1 text-xs text-body">讨论示例</span>
        </div>
        <p class="mt-2 mb-4 text-xs leading-relaxed text-body">自编情境与示例角色，非真实用户帖子。发帖、回复与点赞尚未开放。</p>
        <label for="thread-search" class="sr-only">搜索讨论示例</label>
        <div class="flex items-center gap-3 rounded-xl border border-solid border-line bg-canvas px-3 focus-within:border-red focus-within:ring-2 focus-within:ring-red/30">
          <Search class="size-4 shrink-0 text-body" aria-hidden="true" />
          <input id="thread-search" v-model="query" type="search" maxlength="100" placeholder="搜索话题、关键词…" aria-controls="thread-list" class="min-h-11 w-full min-w-0 border-0 bg-transparent text-sm text-ink outline-none placeholder:text-body" />
        </div>
        <p class="mt-3 mb-0 text-xs text-body" role="status" aria-live="polite" aria-atomic="true">{{ query.trim() ? '搜索结果' : '本版讨论' }} · {{ threads.length }} 则示例</p>
      </header>
      <div id="thread-list">
        <ThreadCard v-for="thread in threads" :key="thread.id" :thread="thread" :open="expanded.has(thread.id)" @toggle="toggle" />
        <div v-if="!threads.length" class="px-5 py-12 text-center">
          <SearchX class="mx-auto size-7 text-body" aria-hidden="true" />
          <h3 class="mt-4 mb-2 text-base font-semibold text-ink">没有匹配的讨论</h3>
          <p class="m-0 text-sm leading-relaxed text-body">试试其他关键词，或返回全部讨论。</p>
          <button type="button" class="mt-5 min-h-11 cursor-pointer rounded-full border-0 bg-ink px-5 text-sm font-medium text-surface transition-all hover:bg-black active:scale-95" @click="reset">重置筛选</button>
        </div>
      </div>
      <footer class="border-0 border-t border-solid border-line bg-canvas/60 px-5 py-4 text-center text-xs text-body">{{ threads.length ? '已展示全部匹配示例' : '仅搜索当前版块的内置讨论示例' }}</footer>
    </div>
  </section>
</template>
