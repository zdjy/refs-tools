<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowRight, BookOpen, Focus, Handshake } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import { editorialFilters, filterGuides, type EditorialFilter } from '../../../content/editorial'
const activeFilter = ref<EditorialFilter>('全部')
const guides = computed(() => filterGuides(activeFilter.value))
const illustrations = { 'observation-angle': Focus, 'ruleset-reading': BookOpen, 'pregame-briefing': Handshake }
</script>

<template>
  <section class="mt-10 compact:mt-14" aria-labelledby="stories-title">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div><p class="mt-0 mb-2 text-xs font-semibold text-red-hover">场下积累，场上从容</p><h2 id="stories-title" class="m-0 text-2xl font-bold tracking-tight text-ink compact:text-3xl">留一点时间，给专业。</h2></div>
      <p class="m-0 text-sm text-body">自编学习导读 · 不记录学习进度</p>
    </div>
    <div class="mt-5 flex flex-wrap gap-2" role="group" aria-label="筛选学习专题">
      <button v-for="filter in editorialFilters" :key="filter" type="button" :aria-pressed="activeFilter === filter" aria-controls="learning-stories" class="min-h-11 cursor-pointer rounded-full border border-solid px-5 py-2 text-sm font-medium transition-all duration-300 ease-[cubic-bezier(.25,.1,.25,1)] active:scale-95" :class="activeFilter === filter ? 'border-ink bg-ink text-surface' : 'border-line bg-surface text-body hover:border-body hover:text-ink'" @click="activeFilter = filter">{{ filter }}</button>
    </div>
    <p class="sr-only" role="status" aria-live="polite">{{ activeFilter }}：{{ guides.length }} 篇学习导读</p>
    <div id="learning-stories" class="mt-5 grid grid-cols-[minmax(0,1fr)] gap-5 compact:grid-cols-2 lg:grid-cols-3">
      <RouterLink v-for="article in guides" :key="article.id" :to="article.path" class="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-solid border-line bg-surface text-ink no-underline shadow-card transition-all duration-300 ease-[cubic-bezier(.25,.1,.25,1)] hover:-translate-y-1 hover:border-body active:scale-[.98]">
        <div aria-hidden="true" class="relative flex h-36 items-center justify-center overflow-hidden bg-soft">
          <div class="absolute inset-y-0 right-0 w-1/2 bg-sand [clip-path:polygon(36%_0,100%_0,100%_100%,0_100%)]"></div>
          <component :is="illustrations[article.id as keyof typeof illustrations]" class="relative size-16 text-body transition-transform duration-500 ease-[cubic-bezier(.25,.1,.25,1)] group-hover:scale-105" :stroke-width="1" />
          <span class="absolute bottom-3 left-5 text-xs font-medium text-body">{{ article.label }}</span>
        </div>
        <div class="flex grow flex-col p-5 compact:p-6">
          <h3 class="mt-0 mb-3 text-xl leading-relaxed font-bold tracking-tight transition-colors duration-300 group-hover:text-red">{{ article.title }}</h3>
          <p class="mt-0 mb-5 grow text-sm leading-[1.85] text-body">{{ article.summary }}</p>
          <div class="flex min-h-11 items-center justify-between gap-2 border-0 border-t border-solid border-line pt-4 text-xs font-medium"><span>{{ article.category }} / 自编导读</span><ArrowRight class="size-5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" /></div>
        </div>
      </RouterLink>
    </div>
  </section>
</template>
