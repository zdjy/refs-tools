<script setup lang="ts">
import { ArrowUpRight, ClipboardList } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import { vReveal } from '../../../components/ui/motion/reveal'
import { modules } from '../../../navigation/modules'
</script>

<template>
  <section v-reveal class="relative mt-14 overflow-hidden rounded-3xl bg-ink p-6 text-surface compact:mt-24 compact:p-10 xl:p-14" aria-labelledby="closing-title">
    <div aria-hidden="true" class="pointer-events-none absolute inset-y-0 right-0 w-[45%] bg-body/25 [clip-path:polygon(40%_0,100%_0,100%_100%,0_100%)]"></div>
    <div class="relative grid gap-8 tablet:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] tablet:items-end">
      <div>
        <p class="mt-0 mb-4 flex items-center gap-2 font-mono text-xs tracking-wider text-surface uppercase"><ClipboardList class="size-4" aria-hidden="true" />Courtside / 场边工具</p>
        <h2 id="closing-title" class="m-0 text-3xl leading-[1.15] font-bold tracking-tight compact:text-6xl">读完了，<br>回到球场。</h2>
      </div>
      <div>
        <p class="m-0 text-sm leading-[1.9] text-surface/80 compact:text-base">本地工作台提供记分、技术统计与计时，记录仅保存在当前设备，不会自动同步到赛事或赛后主记录。</p>
        <RouterLink :to="modules.workbench.path" class="group mt-6 inline-flex min-h-12 items-center gap-5 rounded-full bg-surface px-6 py-3 text-sm font-medium text-ink no-underline transition-all duration-300 ease-[cubic-bezier(.25,.1,.25,1)] hover:bg-sand active:scale-95">进入场边工作台<ArrowUpRight class="size-5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" /></RouterLink>
      </div>
    </div>
  </section>
</template>
