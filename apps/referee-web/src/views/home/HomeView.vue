<script setup lang="ts">
import { RouterLink } from 'vue-router'
import NavigationShell from '../../components/navigation/NavigationShell.vue'
import ModuleCard from '../../components/navigation/ModuleCard.vue'
import LocalWorkbenchNotice from '../../components/navigation/LocalWorkbenchNotice.vue'
import { moduleGroups, modules } from '../../navigation/modules'
</script>

<template>
  <NavigationShell>
    <section class="relative overflow-hidden rounded-3xl bg-sand p-6 compact:p-8 tablet:grid tablet:grid-cols-[minmax(0,1fr)_minmax(240px,.55fr)] tablet:items-center tablet:gap-8 xl:p-10" aria-labelledby="home-title">
      <div aria-hidden="true" class="pointer-events-none absolute inset-y-0 right-0 w-[42%] bg-facet opacity-85 [clip-path:polygon(65%_0,100%_0,100%_100%,0_100%)]"></div>
      <div class="relative min-w-0">
        <h1 id="home-title" class="m-0 max-w-[560px] text-ink text-3xl leading-snug font-bold tracking-tight compact:text-4xl xl:text-[40px]">篮球裁判工作与学习入口</h1>
        <p class="mt-4 mb-0 text-base leading-relaxed text-body">学习备考、资质认证、赛事履职与场边工具。</p>
      </div>
      <div class="relative mt-6 flex min-w-0 flex-col items-start gap-3 tablet:mt-0">
        <RouterLink :to="modules.workbench.path" class="inline-flex min-h-12 min-w-11 items-center justify-center rounded-full bg-ink px-6 py-3 text-sm font-medium text-surface no-underline transition-all duration-300 active:scale-95">进入本地工作台</RouterLink>
        <div><RouterLink :to="modules.learning.path" class="inline-flex min-h-11 min-w-11 items-center rounded-full px-2 text-sm font-medium text-ink underline underline-offset-4 transition-all duration-300 hover:text-red-hover active:scale-95">浏览学习中心</RouterLink><p class="mt-0 mb-0 px-2 text-xs text-body">学习模块建设中</p></div>
      </div>
    </section>
    <section class="mt-9" aria-label="全部模块">
      <div class="mb-6 flex flex-wrap items-baseline justify-between gap-2"><p class="m-0 text-xl font-bold text-ink">全部模块</p><p class="m-0 text-sm text-body">按场景选择入口，可用状态见各模块说明。</p></div>
      <section v-for="group in moduleGroups" :key="group.title" class="mt-7" :aria-label="group.title">
        <h2 class="mt-0 mb-4 text-lg font-bold text-ink">{{ group.title }}</h2>
        <div class="grid grid-cols-[minmax(0,1fr)] gap-4 compact:grid-cols-2 xl:grid-cols-3"><ModuleCard v-for="id in group.items" :key="id" :module="modules[id]" /></div>
      </section>
    </section>
    <LocalWorkbenchNotice />
  </NavigationShell>
</template>
