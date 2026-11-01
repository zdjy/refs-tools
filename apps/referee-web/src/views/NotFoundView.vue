<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <main class="app-shell">
    <header class="topbar">
      <RouterLink class="brand" to="/workbench"><span class="brand-mark">R</span><span>裁判工具箱</span></RouterLink>
    </header>
    <section class="not-found" aria-labelledby="not-found-title">
      <p class="eyebrow">404</p>
      <h1 id="not-found-title">页面不存在</h1>
      <p>该地址没有对应的页面。</p>
      <RouterLink class="not-found-link" to="/workbench">返回本地工作台</RouterLink>
    </section>
  </main>
</template>

<style scoped>
.not-found { max-width: 42rem; margin: 4rem auto; padding: 0 1.5rem; }
.not-found h1 { margin: 0.5rem 0; }
.not-found p { color: var(--muted); }
.not-found-link { color: var(--ink); font-weight: 600; }
.not-found-link:focus-visible { outline: 3px solid var(--red); outline-offset: 3px; }
</style>
