<script setup lang="ts">
import { RouterLink } from 'vue-router'
import BrandLink from '../components/navigation/BrandLink.vue'
</script>

<template>
  <main class="min-h-screen">
    <header class="flex min-h-16 items-center justify-between gap-2 border-0 border-b border-solid border-line bg-canvas/90 px-4 py-2 backdrop-blur-md md:px-8">
      <BrandLink />
    </header>
    <section class="mx-auto my-10 max-w-[42rem] border-0 border-l border-solid border-ink pl-6 compact:my-16 compact:pl-10" aria-labelledby="not-found-title">
      <div>
        <p class="m-0 font-mono text-5xl font-bold tracking-tight text-accent-hover tabular-nums compact:text-6xl" aria-hidden="true">404</p>
        <h1 id="not-found-title" class="mx-0 mt-3 mb-2 text-3xl font-bold tracking-tight text-ink focus:outline-hidden">页面不存在</h1>
        <p class="m-0 text-base leading-relaxed text-body">该地址没有对应的页面，可能链接有误或内容已移动。</p>
        <div class="mt-6 flex flex-wrap gap-3">
          <RouterLink class="inline-flex min-h-11 min-w-11 items-center rounded-full bg-ink px-5 py-3 text-sm font-medium text-surface no-underline transition-all duration-200 hover:bg-black active:scale-95" to="/">返回社区</RouterLink>
          <RouterLink class="inline-flex min-h-11 min-w-11 items-center rounded-full border border-solid border-line bg-surface px-5 py-3 text-sm font-medium text-ink no-underline transition-all duration-200 hover:bg-soft active:scale-95" to="/workbench">进入本地工作台</RouterLink>
        </div>
      </div>
    </section>
  </main>
</template>
