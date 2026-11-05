<script setup lang="ts">
import { ArrowUpRight } from '@lucide/vue'
</script>

<template>
  <header class="mb-6">
    <div class="flex items-center justify-between gap-3">
      <h1 class="m-0 text-3xl font-bold tracking-tight text-ink focus:outline-hidden compact:text-4xl">裁判社区</h1>
      <a href="#community-guide" class="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-solid border-line bg-surface px-4 text-xs font-medium text-ink no-underline transition-all hover:bg-soft active:scale-95 compact:px-5 compact:text-sm">社区说明<ArrowUpRight class="size-4" aria-hidden="true" /></a>
    </div>
    <p class="mt-3 mb-5 text-sm leading-relaxed text-body">篮球裁判的交流与协作空间。从一个回合聊起，把场上的经验留在这里。</p>
  </header>
</template>
