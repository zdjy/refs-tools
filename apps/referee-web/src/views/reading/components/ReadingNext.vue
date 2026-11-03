<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import ArticleCover from '../../../components/content/ArticleCover.vue'
import type { EditorialArticle } from '../../../content/editorial'

defineProps<{ next: EditorialArticle; related: readonly EditorialArticle[] }>()
</script>

<template>
  <section class="mt-12" aria-labelledby="next-title">
    <h2 id="next-title" class="mt-0 mb-5 font-mono text-xs font-normal tracking-wider text-body uppercase">Next / 接着读</h2>
    <RouterLink :to="next.path" class="group grid overflow-hidden rounded-2xl border border-solid border-line bg-surface text-ink no-underline shadow-card transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lift active:scale-[.99] compact:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <div class="aspect-[16/9] overflow-hidden compact:aspect-auto"><ArticleCover :motif="next.motif" class="transition-transform duration-500 group-hover:scale-105" /></div>
      <div class="flex flex-col justify-center p-6 compact:p-10">
        <p class="mt-0 mb-3 text-xs font-bold tracking-wider text-red-hover uppercase">{{ next.label }}</p>
        <p class="m-0 text-2xl leading-snug font-bold tracking-tight compact:text-4xl">{{ next.title }}</p>
        <p class="mt-4 mb-0 text-sm leading-relaxed text-body">{{ next.summary }}</p>
        <span class="mt-6 inline-flex items-center gap-3 text-sm font-medium">继续阅读<ArrowRight class="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" /></span>
      </div>
    </RouterLink>
    <ul v-if="related.length" class="m-0 mt-5 grid list-none gap-3 p-0 compact:grid-cols-2">
      <li v-for="item in related" :key="item.id">
        <RouterLink :to="item.path" class="flex min-h-20 items-center justify-between gap-4 rounded-xl border border-solid border-line bg-surface p-5 text-base leading-relaxed font-medium text-ink no-underline transition-all duration-200 ease-out hover:border-body hover:text-red-hover active:scale-[.98]">{{ item.title }}<ArrowRight class="size-5 shrink-0" aria-hidden="true" /></RouterLink>
      </li>
    </ul>
  </section>
</template>
