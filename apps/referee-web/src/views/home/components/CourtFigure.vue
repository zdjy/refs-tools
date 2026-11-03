<script setup lang="ts">
import { ScanEye } from '@lucide/vue'
</script>

<template>
  <figure class="relative m-0 flex min-h-[300px] flex-col justify-between overflow-hidden rounded-2xl bg-facet p-5 compact:min-h-[360px] compact:p-6">
    <div aria-hidden="true" class="pointer-events-none absolute inset-0 bg-sand [clip-path:polygon(0_0,75%_0,30%_100%,0_100%)]"></div>
    <svg class="pointer-events-none absolute inset-0 h-full w-full text-ink" viewBox="0 0 520 420" fill="none" aria-hidden="true">
      <g transform="translate(100 -45) rotate(24 180 240)" stroke="currentColor" stroke-width="2" opacity=".22">
        <rect x="20" y="50" width="320" height="510" rx="3" />
        <path d="M20 305h320M126 50v104h108V50M126 560V456h108v104" />
        <circle cx="180" cy="305" r="48" />
        <path d="M126 154a54 54 0 0 0 108 0M126 456a54 54 0 0 1 108 0M42 50v55a144 144 0 0 0 276 0V50M42 560v-55a144 144 0 0 1 276 0v55M160 68h40M160 542h40" />
        <circle cx="180" cy="80" r="10" /><circle cx="180" cy="530" r="10" />
      </g>
      <path d="m155 283 100-100 126 66" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 7" opacity=".45" />
      <circle cx="255" cy="183" r="52" class="stroke-surface" stroke-width="1.5" />
      <circle cx="255" cy="183" r="8" class="fill-red" />
      <circle cx="155" cy="283" r="5" class="fill-ink" /><circle cx="381" cy="249" r="5" class="fill-ink" />
    </svg>
    <div class="relative flex items-center justify-between gap-2 text-xs font-medium text-ink"><span>球场观察笔记</span><ScanEye class="size-5" :stroke-width="1.5" aria-hidden="true" /></div>
    <figcaption class="relative mt-44 self-start rounded-2xl border border-solid border-line bg-surface px-4 py-3 shadow-card compact:mt-56">
      <p class="m-0 text-sm font-semibold text-ink">位置改变，视野也会改变。</p>
      <p class="mt-1 mb-0 text-xs leading-relaxed text-body">观察关系示意，非站位标准</p>
    </figcaption>
  </figure>
</template>
