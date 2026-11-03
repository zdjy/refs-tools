<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import { featuredStory as featured } from '../home.presentation'
import CourtFigure from './CourtFigure.vue'
</script>

<template>
  <section aria-labelledby="featured-title" class="relative overflow-hidden rounded-3xl bg-sand p-5 compact:p-8 xl:p-10">
    <div aria-hidden="true" class="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-facet [clip-path:polygon(60%_0,100%_0,100%_100%,0_100%)]"></div>
    <div class="relative grid gap-7 tablet:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] tablet:items-center xl:gap-12">
      <div class="min-w-0 py-2">
        <p class="mt-0 mb-5 flex items-center gap-2 text-xs font-semibold text-body"><span class="h-px w-6 bg-red" aria-hidden="true"></span>本期精选 / {{ featured.label }}</p>
        <h2 id="featured-title" class="m-0 max-w-[540px] text-3xl leading-[1.25] font-bold tracking-tight text-ink compact:text-[42px] xl:text-[52px]">看清接触之前，<br>先看清位置。</h2>
        <p class="mt-5 mb-0 max-w-[420px] text-base leading-[1.9] text-body">{{ featured.summary }}</p>
        <RouterLink :to="featured.path" class="group mt-6 inline-flex min-h-12 items-center gap-6 rounded-full bg-ink px-6 py-3 text-sm font-medium text-surface no-underline transition-all duration-300 ease-[cubic-bezier(.25,.1,.25,1)] hover:bg-black active:scale-95">阅读完整导读<ArrowRight class="size-5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" /></RouterLink>
        <p class="mt-4 mb-0 text-xs text-body">自编学习导读 · 不替代官方裁判法</p>
      </div>
      <CourtFigure />
    </div>
    <div class="relative mt-7 hidden gap-6 border-0 border-t border-solid border-body/20 pt-5 compact:grid compact:grid-cols-3">
      <div v-for="(section, index) in featured.sections" :key="section.id" class="min-w-0">
        <p class="mt-0 mb-1 text-xs font-medium text-body">{{ ['回到接触之前', '寻找开放视角', '与同伴对齐事实'][index] }}</p>
        <RouterLink :to="`${featured.path}#${section.id}`" class="group flex min-h-11 items-center justify-between gap-3 rounded-xl text-sm font-semibold text-ink no-underline transition-all duration-300 ease-[cubic-bezier(.25,.1,.25,1)] hover:text-red-hover active:scale-[.98]">{{ section.title }}<ArrowRight class="size-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" /></RouterLink>
      </div>
    </div>
  </section>
</template>
