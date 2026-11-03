<script setup lang="ts">
import { BookOpen, Clock, MessageSquare } from '@lucide/vue'
import ArticleCover from '../../../components/content/ArticleCover.vue'
import { vDrift, vReveal } from '../../../components/ui/motion/reveal'
import type { EditorialArticle } from '../../../content/editorial'
import { readingMinutes } from '../reading.presentation'

defineProps<{ article: EditorialArticle }>()
</script>

<template>
  <header class="relative overflow-hidden rounded-2xl bg-sand">
    <div aria-hidden="true" class="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-facet [clip-path:polygon(40%_0,100%_0,100%_100%,0_100%)]"></div>
    <div class="relative grid gap-6 p-5 compact:p-8 tablet:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] tablet:items-center xl:p-12">
      <div class="min-w-0">
        <p v-reveal class="mt-0 mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs tracking-wider text-body uppercase">
          <span class="inline-flex items-center gap-2"><component :is="article.kind === 'guide' ? BookOpen : MessageSquare" class="size-4" aria-hidden="true" />{{ article.label }}</span>
          <span class="inline-flex items-center gap-2"><Clock class="size-4" aria-hidden="true" />约 {{ readingMinutes(article) }} 分钟</span>
        </p>
        <h1 v-reveal="{ delay: 0.08, y: 36 }" class="m-0 focus:outline-hidden text-[34px] leading-[1.18] font-bold tracking-tight text-ink compact:text-5xl xl:text-[64px]">{{ article.title }}</h1>
        <p v-reveal="{ delay: 0.2 }" class="mt-6 mb-0 max-w-[620px] text-base leading-[1.9] text-body">{{ article.summary }}</p>
        <p v-reveal="{ delay: 0.28 }" class="mt-5 mb-0 text-xs leading-relaxed text-body">{{ article.kind === 'guide' ? '本站自编学习导读，不记录学习进度。' : '自编讨论示例，非真实用户帖子；发帖与回复尚未开放。' }}</p>
      </div>
      <div v-drift="14" class="hidden aspect-[4/3] overflow-hidden rounded-xl border border-solid border-line shadow-card tablet:block"><ArticleCover :motif="article.motif" /></div>
    </div>
  </header>
</template>
