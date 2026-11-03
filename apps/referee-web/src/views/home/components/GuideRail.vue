<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import ArticleCover from '../../../components/content/ArticleCover.vue'
import { vReveal } from '../../../components/ui/motion/reveal'
import { guideRail } from '../home.presentation'
</script>

<template>
  <section class="mt-14 compact:mt-24" aria-labelledby="rail-title">
    <div v-reveal class="max-w-[640px]">
      <p class="mt-0 mb-3 text-xs font-bold tracking-wider text-red-hover uppercase">Guides / 学习导读</p>
      <h2 id="rail-title" class="m-0 text-3xl font-bold tracking-tight text-ink compact:text-5xl">不只记住结论，也读懂过程。</h2>
      <p class="mt-4 mb-0 text-sm leading-relaxed text-body compact:text-base">每篇导读三个小节，可从目录直接跳到任意一节。按主题自由阅读，不记录学习进度。</p>
    </div>
    <ul class="mt-8 grid list-none grid-cols-[minmax(0,1fr)] gap-6 p-0 compact:grid-cols-2 xl:grid-cols-3">
      <li v-for="(article, index) in guideRail" :key="article.id" v-reveal="{ delay: (index % 3) * 0.08 }" class="min-w-0">
        <article class="group flex h-full flex-col overflow-hidden rounded-xl border border-solid border-line bg-surface shadow-card transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lift">
          <div class="aspect-[4/3] overflow-hidden"><ArticleCover :motif="article.motif" class="transition-transform duration-500 group-hover:scale-105" /></div>
          <div class="flex grow flex-col p-6">
            <p class="mt-0 mb-3 text-xs font-bold tracking-wider text-red-hover uppercase">{{ article.category }} / {{ article.label }}</p>
            <h3 class="m-0 text-xl leading-snug font-bold tracking-tight text-ink"><RouterLink :to="article.path" class="text-ink no-underline after:absolute after:inset-0 hover:text-red-hover">{{ article.title }}</RouterLink></h3>
            <p class="mt-3 mb-0 text-sm leading-relaxed text-body">{{ article.summary }}</p>
            <ol class="mt-5 mb-0 list-none border-0 border-t border-solid border-line p-0 pt-3">
              <li v-for="(section, number) in article.sections" :key="section.id" class="flex gap-3 py-1 text-xs leading-relaxed text-body"><span class="font-mono">{{ number + 1 }}</span>{{ section.title }}</li>
            </ol>
            <span class="mt-auto flex items-center justify-between pt-5 text-sm font-medium text-ink">阅读导读<ArrowRight class="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" /></span>
          </div>
        </article>
      </li>
    </ul>
  </section>
</template>
