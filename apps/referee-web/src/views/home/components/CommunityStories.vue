<script setup lang="ts">
import { ArrowRight, MessageSquare } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import { discussionStories } from '../home.presentation'
</script>

<template>
  <section class="min-w-0" aria-labelledby="community-title">
    <p class="mt-0 mb-3 text-xs font-semibold text-red-hover">从一个具体问题开始</p>
    <div class="flex flex-wrap items-baseline justify-between gap-3">
      <h2 id="community-title" class="m-0 text-2xl font-bold tracking-tight text-ink compact:text-3xl">场边之外，继续讨论。</h2>
      <span class="text-xs font-medium text-body">社区讨论示例</span>
    </div>
    <p class="mt-3 mb-6 text-sm leading-relaxed text-body">把经验变成可以交流的问题。以下均为自编情境，非真实用户帖子，暂不支持发帖与回复。</p>
    <div class="overflow-hidden rounded-2xl border border-solid border-line bg-surface shadow-card">
      <article v-for="(article, index) in discussionStories" :key="article.id" class="p-5 compact:p-7" :class="index > 0 ? 'border-0 border-t border-solid border-line' : ''">
        <p class="mt-0 mb-3 flex items-center gap-2 text-xs font-medium text-body"><MessageSquare class="size-4 text-red" aria-hidden="true" />{{ article.label }}</p>
        <RouterLink :to="article.path" class="group flex min-h-11 items-start justify-between gap-4 rounded-2xl text-ink no-underline transition-all duration-300 ease-[cubic-bezier(.25,.1,.25,1)] hover:text-red-hover active:scale-[.98]">
          <h3 class="m-0 text-xl leading-relaxed font-bold tracking-tight compact:text-2xl">{{ article.title }}</h3>
          <ArrowRight class="mt-2 size-5 shrink-0 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
        </RouterLink>
        <p class="mt-4 mb-0 text-sm leading-[1.85] text-body">{{ article.excerpt }}</p>
        <div class="mt-5 rounded-2xl bg-soft p-4">
          <p class="mt-0 mb-2 text-xs font-semibold text-ink">讨论切入点</p>
          <p class="m-0 text-sm leading-relaxed text-body">{{ article.summary }}</p>
        </div>
        <RouterLink :to="`${article.path}#example-response`" class="mt-4 inline-flex min-h-11 items-center gap-3 rounded-full text-sm font-medium text-ink no-underline transition-all duration-300 ease-[cubic-bezier(.25,.1,.25,1)] hover:text-red-hover active:scale-95">
          查看示例回应<ArrowRight class="size-4" aria-hidden="true" />
          <span class="sr-only">：{{ article.title }}</span>
        </RouterLink>
      </article>
    </div>
  </section>
</template>
