<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <main class="min-h-screen">
    <header class="flex min-h-16 items-center justify-between gap-2 border-0 border-b border-solid border-line bg-canvas/90 px-4 py-2 backdrop-blur-md md:px-8">
      <RouterLink class="inline-flex min-h-11 items-center gap-2.5 text-[14px] font-bold text-ink no-underline" to="/"><span class="grid size-7 place-items-center rounded-full bg-ink text-surface">R</span><span>裁判工具箱</span></RouterLink>
    </header>
    <section class="mx-auto my-16 max-w-[42rem] px-6 py-0" aria-labelledby="not-found-title">
      <p class="text-muted">404</p>
      <h1 id="not-found-title" class="mx-0 my-2">页面不存在</h1>
      <p class="text-muted">该地址没有对应的页面。</p>
      <div class="flex flex-wrap gap-3">
        <RouterLink class="inline-flex min-h-11 min-w-11 items-center rounded-full bg-ink px-5 py-3 font-medium text-surface no-underline transition-all duration-200 active:scale-95" to="/">返回社区</RouterLink>
        <RouterLink class="inline-flex min-h-11 min-w-11 items-center rounded-full bg-soft px-5 py-3 font-medium text-ink no-underline transition-all duration-200 active:scale-95" to="/workbench">进入本地工作台</RouterLink>
      </div>
    </section>
  </main>
</template>
