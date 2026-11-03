<script setup lang="ts">
import { ArrowRight, ChevronDown } from '@lucide/vue'
import { RouterLink } from 'vue-router'
const checklist = [
  { title: '核对本场规则', text: '确认适用版本、赛事补充规程与岗位安排。不把上一场比赛的参数直接当作本场默认值。' },
  { title: '检查记录与计时', text: '核对设备、信号及参数，与记录台确认沟通方式。使用本地工具时，明确其用途与正式记录流程的区别。' },
  { title: '沟通观察与配合', text: '按本场裁判法约定区域交接及信息补充方式，让每个人知道出现遮挡或信息不一致时如何沟通。' },
]
</script>

<template>
  <section class="mt-10 grid gap-6 rounded-3xl border border-solid border-line bg-surface p-5 shadow-card compact:mt-14 compact:p-8 tablet:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] tablet:gap-12" aria-labelledby="checklist-title">
    <div>
      <p class="mt-0 mb-3 text-xs font-semibold text-red-hover">从阅读回到球场</p>
      <h2 id="checklist-title" class="m-0 text-2xl leading-snug font-bold tracking-tight text-ink compact:text-3xl">上场前，<br>把准备再做具体一点。</h2>
      <p class="mt-4 mb-0 max-w-md text-sm leading-relaxed text-body">一份与同伴逐项沟通的提纲，不替代赛事规定，也不保存勾选状态。</p>
      <RouterLink to="/read/pregame-briefing" class="mt-5 inline-flex min-h-11 items-center gap-3 rounded-full bg-soft px-5 py-3 text-sm font-medium text-ink no-underline transition-all duration-300 ease-[cubic-bezier(.25,.1,.25,1)] hover:bg-sand active:scale-95">阅读完整提纲<ArrowRight class="size-4" aria-hidden="true" /></RouterLink>
    </div>
    <div class="min-w-0 self-center">
      <details v-for="item in checklist" :key="item.title" class="group border-0 border-b border-solid border-line">
        <summary class="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 rounded-full px-2 py-4 text-base font-medium text-ink transition-all duration-300 ease-[cubic-bezier(.25,.1,.25,1)] hover:text-red-hover active:scale-[.98] [&::-webkit-details-marker]:hidden">
          {{ item.title }}<ChevronDown class="size-4 shrink-0 transition-transform duration-300 group-open:rotate-180" aria-hidden="true" />
        </summary>
        <p class="mx-2 mt-0 mb-5 text-sm leading-[1.85] text-body">{{ item.text }}</p>
      </details>
    </div>
  </section>
</template>
