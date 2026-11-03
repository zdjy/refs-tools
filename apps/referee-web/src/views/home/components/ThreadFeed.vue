<script setup lang="ts">
import { MessagesSquare } from '@lucide/vue'
import { vReveal } from '../../../components/ui/motion/reveal'
import { boardTabs } from '../home.presentation'
import { useThreadFeed } from '../useThreadFeed'
import ThreadCard from './ThreadCard.vue'

const { board, threads, expanded, toggle } = useThreadFeed()
</script>

<template>
  <section class="mt-14 compact:mt-24" aria-labelledby="forum-title">
    <div class="relative overflow-hidden rounded-3xl bg-sand p-5 compact:p-8 xl:p-12">
      <div aria-hidden="true" class="pointer-events-none absolute inset-y-0 left-0 w-[40%] bg-facet [clip-path:polygon(0_0,100%_0,60%_100%,0_100%)]"></div>
      <div v-reveal class="relative grid gap-6 tablet:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] tablet:items-end">
        <div class="tablet:col-start-2">
          <p class="mt-0 mb-3 flex items-center gap-2 font-mono text-xs tracking-wider text-body uppercase"><MessagesSquare class="size-4" aria-hidden="true" />Forum / 社区讨论示例</p>
          <h2 id="forum-title" class="m-0 text-3xl font-bold tracking-tight text-ink compact:text-5xl">场边之外，继续讨论。</h2>
          <p class="mt-4 mb-0 text-sm leading-relaxed text-body compact:text-base">以下为随应用发布的自编讨论示例，人物均为示例角色，数值均为示例值，并非真实用户帖子。发帖、回复与点赞尚未开放。</p>
        </div>
      </div>
    </div>
    <div class="mt-8 grid items-start gap-8 tablet:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)] xl:gap-12">
      <nav aria-label="论坛版块" class="min-w-0 tablet:sticky tablet:top-6">
        <p class="mt-0 mb-3 font-mono text-xs tracking-wider text-body uppercase">版块</p>
        <div class="flex gap-2 overflow-x-auto pb-2 tablet:flex-col tablet:overflow-visible tablet:pb-0" role="group" aria-label="按版块筛选讨论">
          <button v-for="tab in boardTabs" :key="tab.id" type="button" :aria-pressed="board === tab.id" aria-controls="thread-list" class="min-h-11 shrink-0 cursor-pointer rounded-full border border-solid px-5 py-2 text-left text-sm font-medium transition-all duration-300 ease-[cubic-bezier(.25,.1,.25,1)] active:scale-95 tablet:rounded-2xl" :class="board === tab.id ? 'border-ink bg-ink text-surface' : 'border-line bg-surface text-body hover:border-body hover:text-ink'" @click="board = tab.id">
            <span class="block">{{ tab.title }}</span>
            <span class="mt-0.5 hidden text-xs font-normal opacity-80 tablet:block">{{ tab.hint }}</span>
          </button>
        </div>
      </nav>
      <div id="thread-list" class="min-w-0">
        <p class="sr-only" role="status" aria-live="polite">共 {{ threads.length }} 则讨论示例</p>
        <div class="grid gap-5">
          <ThreadCard v-for="(thread, index) in threads" :key="thread.id" v-reveal="{ delay: Math.min(index, 2) * 0.06, y: 20 }" :thread="thread" :open="expanded.has(thread.id)" @toggle="toggle" />
        </div>
      </div>
    </div>
  </section>
</template>
