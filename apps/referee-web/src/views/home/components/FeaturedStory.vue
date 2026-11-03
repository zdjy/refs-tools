<script setup lang="ts">
import { ArrowRight, LayoutDashboard } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import { editorialArticles } from '../../../content/editorial'
import { modules } from '../../../navigation/modules'
import CourtFigure from './CourtFigure.vue'
const featured = editorialArticles[0]
</script>

<template>
  <section aria-labelledby="featured-title" class="grid gap-7 rounded-3xl bg-sand p-5 compact:p-8 tablet:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] tablet:items-center xl:gap-12 xl:p-10">
    <div class="min-w-0 py-2">
      <p class="mt-0 mb-5 flex items-center gap-2 text-xs font-semibold text-body"><span class="h-px w-6 bg-red" aria-hidden="true"></span>本期研读 / {{ featured.label }}</p>
      <h2 id="featured-title" class="m-0 max-w-[540px] text-3xl leading-[1.3] font-bold tracking-tight text-ink compact:text-[42px] xl:text-[48px]">看清接触之前，<br>先看清位置。</h2>
      <p class="mt-5 mb-0 max-w-[420px] text-base leading-[1.9] text-body">{{ featured.summary }}</p>
      <RouterLink :to="featured.path" class="group mt-7 inline-flex min-h-12 items-center gap-6 rounded-full bg-ink px-6 py-3 text-sm font-medium text-surface no-underline transition-all duration-300 ease-[cubic-bezier(.25,.1,.25,1)] hover:bg-black active:scale-95">阅读完整导读<ArrowRight class="size-5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" /></RouterLink>
      <div class="mt-7 border-0 border-t border-solid border-body/20 pt-4">
        <RouterLink :to="modules.workbench.path" class="inline-flex min-h-11 items-center gap-2 rounded-full text-sm font-medium text-ink no-underline transition-all duration-300 hover:text-red-hover active:scale-95"><LayoutDashboard class="size-4" aria-hidden="true" />去场边？进入本地工作台<ArrowRight class="size-4" aria-hidden="true" /></RouterLink>
        <p class="mt-1 mb-0 text-xs text-body">无需登录 · 记录仅保存在当前设备</p>
      </div>
    </div>
    <CourtFigure />
  </section>
</template>
