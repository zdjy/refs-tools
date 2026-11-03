<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowRight } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import { editorialFilters, type EditorialFilter } from '../../../content/editorial'
import { learningPreviews } from '../home.presentation'
const activeFilter = ref<EditorialFilter>('全部')
const guides = computed(() => learningPreviews(activeFilter.value))
</script>

<template>
  <section class="mt-10 compact:mt-14" aria-labelledby="stories-title">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="mt-0 mb-3 text-xs font-semibold text-red-hover">研读室 / 自编学习导读</p>
        <h2 id="stories-title" class="m-0 text-2xl font-bold tracking-tight text-ink compact:text-3xl">不只记住结论，也读懂过程。</h2>
      </div>
      <div class="flex flex-wrap gap-2" role="group" aria-label="筛选学习专题">
        <button v-for="filter in editorialFilters" :key="filter" type="button" :aria-pressed="activeFilter === filter" aria-controls="learning-stories" class="min-h-11 cursor-pointer rounded-full border border-solid px-5 py-2 text-sm font-medium transition-all duration-300 ease-[cubic-bezier(.25,.1,.25,1)] active:scale-95" :class="activeFilter === filter ? 'border-ink bg-ink text-surface' : 'border-line bg-surface text-body hover:border-body hover:text-ink'" @click="activeFilter = filter">{{ filter }}</button>
      </div>
    </div>
    <p class="sr-only" role="status" aria-live="polite">{{ activeFilter }}：{{ guides.length }} 篇学习导读</p>
    <div id="learning-stories" class="mt-6 grid grid-cols-[minmax(0,1fr)] gap-5" :class="guides.length > 1 ? 'tablet:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]' : ''">
      <article v-for="(article, index) in guides" :key="article.id" class="min-w-0 rounded-2xl border border-solid border-line bg-surface p-5 shadow-card compact:p-7" :class="index === 0 ? 'tablet:row-span-2' : ''">
        <p class="mt-0 mb-3 text-xs font-medium text-red-hover">{{ article.category }} / {{ article.label }}</p>
        <h3 class="m-0 font-bold tracking-tight text-ink" :class="index === 0 ? 'text-2xl leading-snug compact:text-3xl' : 'text-xl leading-relaxed'">{{ article.title }}</h3>
        <p class="mt-4 mb-0 text-sm leading-[1.85] text-body">{{ article.summary }}</p>
        <div v-if="index === 0" class="relative mt-6 overflow-hidden rounded-2xl bg-soft p-5 compact:p-6">
          <div aria-hidden="true" class="pointer-events-none absolute top-0 right-0 h-16 w-16 bg-sand [clip-path:polygon(100%_0,100%_100%,0_0)]"></div>
          <p class="relative mt-0 mb-4 text-xs font-medium text-body">正文节选</p>
          <h4 class="relative mt-0 mb-3 text-lg font-semibold text-ink">{{ article.preview.title }}</h4>
          <p class="relative m-0 text-sm leading-[1.9] text-body">{{ article.preview.paragraphs[0] }}</p>
          <p class="mt-4 mb-0 text-sm leading-[1.9] text-body">{{ article.preview.paragraphs[1] }}</p>
        </div>
        <p v-else class="mt-4 mb-0 border-0 border-l-2 border-solid border-sand pl-4 text-sm leading-relaxed text-body">{{ article.takeaway }}</p>
        <RouterLink :to="article.path" class="group mt-5 inline-flex min-h-11 items-center gap-4 rounded-full text-sm font-medium text-ink no-underline transition-all duration-300 ease-[cubic-bezier(.25,.1,.25,1)] hover:text-red-hover active:scale-95">
          {{ index === 0 ? '继续阅读完整导读' : '阅读导读' }}<ArrowRight class="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          <span class="sr-only">：{{ article.title }}</span>
        </RouterLink>
      </article>
    </div>
    <p class="mt-4 mb-0 text-xs leading-relaxed text-body">按主题自由阅读，不记录学习进度；自编笔记不能替代有效规则与官方解释。</p>
  </section>
</template>
