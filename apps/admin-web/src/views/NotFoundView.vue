<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="rounded-2xl border border-solid border-line bg-surface p-6 md:p-10">
    <p class="text-sm font-semibold text-red">404</p>
    <h1 class="text-3xl font-bold">页面不存在</h1>
    <p class="text-body">请检查地址，或从工作台选择业务模块。</p>
    <RouterLink to="/" class="inline-flex min-h-[44px] items-center font-semibold hover:text-red">返回运营工作台</RouterLink>
  </section>
</template>
