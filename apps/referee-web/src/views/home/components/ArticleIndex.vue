<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowUpRight } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import ArticleCover from '../../../components/content/ArticleCover.vue'
import { vReveal } from '../../../components/ui/motion/reveal'
import { articleIndex } from '../home.presentation'

// 悬停或聚焦时在右侧展示封面；触屏无 hover，封面同时出现在导读横轨中。
const hovered = ref(articleIndex[0]!.id)
const preview = computed(() => articleIndex.find((item) => item.id === hovered.value)!)
</script>

<template>
  <section id="index" tabindex="-1" aria-labelledby="index-title" class="mt-12 scroll-mt-6 compact:mt-20">
    <div v-reveal class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="mt-0 mb-3 font-mono text-xs tracking-wider text-red-hover uppercase">Index / 内容索引</p>
        <h2 id="index-title" class="m-0 text-3xl font-bold tracking-tight text-ink compact:text-5xl">全部内容，一页读完。</h2>
      </div>
      <p class="m-0 font-mono text-xs text-body">{{ articleIndex.length }} 篇 · 自编导读与讨论示例</p>
    </div>
    <div class="mt-8 grid items-start gap-8 tablet:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] xl:gap-14">
      <ol class="m-0 list-none border-0 border-t border-solid border-line p-0">
        <li v-for="(item, index) in articleIndex" :key="item.id" v-reveal="{ delay: Math.min(index, 4) * 0.04, y: 16 }" class="border-0 border-b border-solid border-line">
          <RouterLink :to="item.path" class="group flex min-h-20 items-center gap-4 py-4 text-ink no-underline transition-all duration-300 ease-[cubic-bezier(.25,.1,.25,1)] hover:text-red-hover active:scale-[.99] compact:gap-7" @mouseenter="hovered = item.id" @focus="hovered = item.id">
            <span class="w-8 shrink-0 font-mono text-xs text-body compact:w-10">{{ item.number }}</span>
            <span class="min-w-0 grow">
              <span class="block font-mono text-xs tracking-wider text-body uppercase">{{ item.kindLabel }} / {{ item.category }}</span>
              <span class="mt-1 block text-lg leading-snug font-bold tracking-tight compact:text-2xl">{{ item.title }}</span>
            </span>
            <ArrowUpRight class="size-5 shrink-0 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          </RouterLink>
        </li>
      </ol>
      <div class="hidden overflow-hidden rounded-3xl border border-solid border-line shadow-card tablet:sticky tablet:top-6 tablet:block" aria-hidden="true">
        <div class="aspect-[4/3] overflow-hidden"><ArticleCover :motif="preview.motif" class="transition-transform duration-500 ease-[cubic-bezier(.25,.1,.25,1)] hover:scale-105" /></div>
        <p class="m-0 bg-surface p-5 text-sm leading-relaxed text-body">{{ preview.summary }}</p>
      </div>
    </div>
  </section>
</template>
