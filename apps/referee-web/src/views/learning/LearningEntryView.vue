<script setup lang="ts">
import { RouterLink } from 'vue-router'
import NavigationShell from '../../components/navigation/NavigationShell.vue'
import ModuleCard from '../../components/navigation/ModuleCard.vue'
import { learningEntries, modules } from '../../navigation/modules'
</script>

<template>
  <NavigationShell>
    <header class="rounded-2xl bg-sand p-6 compact:p-8">
      <p class="mt-0 mb-3 text-sm font-semibold text-body">建设中</p>
      <h1 class="m-0 text-3xl font-bold tracking-tight text-ink">学习中心</h1>
      <p class="mt-4 mb-0 max-w-[720px] text-base leading-relaxed text-body">学习资料模块尚未开放，当前无法浏览资料、收藏或记录学习进度。后续将提供规则资料、图文与音视频、收藏及最近访问。</p>
    </header>
    <section class="mt-8" aria-labelledby="learning-entries">
      <h2 id="learning-entries" class="mt-0 mb-4 text-xl text-ink">学习与备考入口</h2>
      <p class="mb-5 text-sm leading-relaxed text-body">以下模块均在建设中，可进入查看功能范围；目前不提供作答、考试报名或成绩查询。</p>
      <div class="grid grid-cols-[minmax(0,1fr)] gap-4 compact:grid-cols-2 xl:grid-cols-3"><ModuleCard v-for="id in learningEntries" :key="id" :module="modules[id]" /></div>
    </section>
    <RouterLink to="/" class="mt-6 inline-flex min-h-11 min-w-11 items-center rounded-full bg-soft px-5 py-3 text-sm font-medium text-ink no-underline transition-all duration-200 hover:bg-sand active:scale-95">返回首页</RouterLink>
  </NavigationShell>
</template>
