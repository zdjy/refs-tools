<script setup lang="ts">
import { ArrowUpRight } from '@lucide/vue'
</script>

<template>
  <!-- 标题与「社区说明」同一行，说明文字在下方整行展开，手机首屏少占一行按钮的高度。 -->
  <header class="mb-5 pb-1">
    <div class="flex items-center justify-between gap-3">
      <h1 class="m-0 text-[32px] leading-[1.15] font-bold tracking-[-0.025em] text-ink focus:outline-hidden compact:text-[40px]">裁判社区</h1>
      <a href="#community-guide" class="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-solid border-line bg-surface/70 px-4 text-sm font-medium text-accent-hover no-underline transition-all duration-200 ease-(--ease-ios) hover:-translate-y-0.5 hover:bg-surface active:scale-95">社区说明<ArrowUpRight class="size-4" :stroke-width="1.5" aria-hidden="true" /></a>
    </div>
    <p class="mt-2 mb-0 max-w-[38em] text-base leading-[1.7] text-body">裁判交流与专业共建社区。探讨每一个关键回合，在这里沉淀你的球场经验。</p>
  </header>
</template>
