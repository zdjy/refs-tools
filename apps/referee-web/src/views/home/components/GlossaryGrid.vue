<script setup lang="ts">
import { vReveal } from '../../../components/ui/motion/reveal'
import { glossary } from '../home.presentation'
</script>

<template>
  <section class="mt-14 compact:mt-24" aria-labelledby="glossary-title">
    <div v-reveal class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="mt-0 mb-3 text-xs font-bold tracking-wider text-red-hover uppercase">Glossary / 案头词汇</p>
        <h2 id="glossary-title" class="m-0 text-3xl font-bold tracking-tight text-ink compact:text-5xl">六个值得常翻的词。</h2>
      </div>
      <p class="m-0 max-w-[360px] text-sm leading-relaxed text-body">自编释义，只描述阅读与记录的方法，不是官方术语定义。</p>
    </div>
    <dl class="m-0 mt-8 grid grid-cols-[minmax(0,1fr)] border-0 border-t border-solid border-line compact:grid-cols-2 tablet:grid-cols-3">
      <div v-for="(item, index) in glossary" :key="item.term" v-reveal="{ delay: (index % 3) * 0.05, y: 14 }" class="group border-0 border-b border-solid border-line px-1 py-6 transition-colors duration-200 compact:px-5">
        <dt class="flex items-baseline gap-3 text-2xl font-bold tracking-tight text-ink transition-colors duration-200 group-hover:text-red-hover"><span class="font-mono text-xs font-normal text-body">{{ String(index + 1).padStart(2, '0') }}</span>{{ item.term }}</dt>
        <dd class="m-0 mt-3 text-sm leading-relaxed text-body">{{ item.note }}</dd>
      </div>
    </dl>
  </section>
</template>
