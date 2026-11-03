<script setup lang="ts">
import { ArrowDown, ArrowRight } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import { vDrift, vReveal } from '../../../components/ui/motion/reveal'
import { modules } from '../../../navigation/modules'
import { featuredStory as featured } from '../home.presentation'
import CourtFigure from './CourtFigure.vue'
</script>

<template>
  <section aria-labelledby="hero-title" class="relative overflow-hidden rounded-3xl bg-sand px-5 pt-8 pb-7 compact:px-8 compact:pt-12 xl:px-12 xl:pt-16">
    <div aria-hidden="true" class="pointer-events-none absolute inset-y-0 right-0 w-[56%] bg-facet [clip-path:polygon(38%_0,100%_0,100%_100%,0_100%)]"></div>
    <div class="relative grid gap-8 tablet:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] tablet:items-end xl:gap-14">
      <div class="min-w-0">
        <p v-reveal class="mt-0 mb-6 flex items-center gap-3 font-mono text-xs tracking-wider text-body uppercase"><span class="h-px w-8 bg-red" aria-hidden="true"></span>裁判手记 / 本期精选</p>
        <h1 id="hero-title" class="m-0 text-[34px] leading-[1.12] xs:text-[40px] font-bold tracking-tight text-ink focus:outline-hidden compact:text-[72px] xl:text-[80px]">
          <span v-reveal="{ delay: 0.05, y: 48 }" class="block">看清接触之前，</span>
          <span v-reveal="{ delay: 0.18, y: 48 }" class="block text-red-hover">先看清位置。</span>
        </h1>
        <p v-reveal="{ delay: 0.32 }" class="mt-7 mb-0 max-w-[460px] text-base leading-[1.9] text-body">{{ featured.summary }}</p>
        <div v-reveal="{ delay: 0.42 }" class="mt-8 flex flex-wrap items-center gap-3">
          <RouterLink :to="featured.path" class="group inline-flex min-h-12 items-center gap-6 rounded-full bg-ink px-6 py-3 text-sm font-medium text-surface no-underline transition-all duration-300 ease-[cubic-bezier(.25,.1,.25,1)] hover:bg-black active:scale-95">阅读完整导读<ArrowRight class="size-5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" /></RouterLink>
          <RouterLink :to="modules.workbench.path" class="inline-flex min-h-12 items-center gap-3 rounded-full bg-surface px-6 py-3 text-sm font-medium text-ink no-underline transition-all duration-300 ease-[cubic-bezier(.25,.1,.25,1)] hover:bg-soft active:scale-95">进入场边工作台</RouterLink>
        </div>
        <p v-reveal="{ delay: 0.5 }" class="mt-4 mb-0 text-xs leading-relaxed text-body">自编学习导读，不替代官方裁判法 · 工作台无需登录，记录仅存当前设备</p>
      </div>
      <div v-drift="18" class="min-w-0"><CourtFigure /></div>
    </div>
    <a href="#index" class="relative mt-8 inline-flex min-h-11 items-center gap-2 rounded-full text-sm font-medium text-ink no-underline transition-all duration-300 hover:text-red-hover active:scale-95"><ArrowDown class="size-4" aria-hidden="true" />浏览全部内容</a>
  </section>
</template>
