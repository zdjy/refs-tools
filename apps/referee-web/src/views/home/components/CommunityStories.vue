<script setup lang="ts">
import { ArrowRight, ChevronDown, ClipboardList, MessageSquare } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import { editorialArticles } from '../../../content/editorial'
const discussions = editorialArticles.filter((article) => article.kind === 'discussion')
const checklist = [
  { title: '核对本场规则', text: '确认适用版本、赛事补充规程与岗位安排。' },
  { title: '检查记录与计时', text: '核对设备、信号及参数，与记录台确认沟通方式。' },
  { title: '沟通观察与配合', text: '按本场裁判法约定区域交接及信息补充方式。' },
]
</script>

<template>
  <section class="mt-10 grid grid-cols-[minmax(0,1fr)] gap-7 compact:mt-14 tablet:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] tablet:gap-8" aria-label="交流与场边准备">
    <div class="min-w-0">
      <div class="mb-5 flex flex-wrap items-baseline justify-between gap-3"><h2 class="m-0 text-2xl font-bold tracking-tight text-ink compact:text-3xl">把经验，放到一起聊。</h2><span class="text-xs font-medium text-body">社区讨论示例</span></div>
      <p class="mt-0 mb-5 text-sm leading-relaxed text-body">从一个具体问题开始。以下为自编示例，非真实用户帖子，暂不支持发帖与回复。</p>
      <div class="overflow-hidden rounded-2xl border border-solid border-line bg-surface shadow-card">
        <article v-for="(article, index) in discussions" :key="article.id" class="p-5 compact:p-6" :class="index > 0 ? 'border-0 border-t border-solid border-line' : ''">
          <p class="mt-0 mb-3 flex items-center gap-2 text-xs font-medium text-body"><MessageSquare class="size-4 text-red" aria-hidden="true" />{{ article.label }}</p>
          <RouterLink :to="article.path" class="group flex min-h-11 items-start justify-between gap-4 rounded-2xl text-ink no-underline transition-all duration-300 hover:text-red-hover active:scale-[.98]">
            <h3 class="m-0 text-lg leading-relaxed font-bold tracking-tight compact:text-xl">{{ article.title }}</h3><ArrowRight class="mt-1 size-5 shrink-0 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          </RouterLink>
          <p class="mt-3 mb-4 text-sm leading-[1.85] text-body">{{ article.summary }}</p>
          <p class="m-0 border-0 border-l-2 border-solid border-sand pl-3 text-xs leading-relaxed text-body">{{ article.takeaway }}</p>
        </article>
      </div>
    </div>
    <aside class="min-w-0 rounded-3xl bg-sand p-5 compact:p-7" aria-labelledby="checklist-title">
      <ClipboardList class="mb-5 size-7 text-ink" :stroke-width="1.5" aria-hidden="true" />
      <p class="mt-0 mb-2 text-xs font-semibold text-body">场边准备</p>
      <h2 id="checklist-title" class="m-0 text-2xl font-bold tracking-tight text-ink">上场前，<br>让准备再具体一点。</h2>
      <p class="mt-4 mb-5 text-sm leading-relaxed text-body">一份沟通提纲，不替代赛事规定。展开查看，和你的同伴逐项确认。</p>
      <details v-for="item in checklist" :key="item.title" class="group border-0 border-t border-solid border-body/20">
        <summary class="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-full px-1 py-3 text-sm font-medium text-ink transition-all duration-300 active:scale-[.98] [&::-webkit-details-marker]:hidden">{{ item.title }}<ChevronDown class="size-4 shrink-0 transition-transform duration-300 group-open:rotate-180" aria-hidden="true" /></summary>
        <p class="mt-0 mb-4 text-sm leading-relaxed text-body">{{ item.text }}</p>
      </details>
      <RouterLink to="/read/pregame-briefing" class="mt-5 inline-flex min-h-11 items-center gap-3 rounded-full bg-surface px-5 py-3 text-sm font-medium text-ink no-underline transition-all duration-300 hover:bg-soft active:scale-95">阅读赛前沟通提纲<ArrowRight class="size-4" aria-hidden="true" /></RouterLink>
    </aside>
  </section>
</template>
