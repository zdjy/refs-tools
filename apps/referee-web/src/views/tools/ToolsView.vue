<script setup lang="ts">
import NavigationShell from '../../components/navigation/NavigationShell.vue'
import ModuleCard from '../../components/navigation/ModuleCard.vue'
import LocalWorkbenchNotice from '../../components/navigation/LocalWorkbenchNotice.vue'
import { modules, toolEntries } from '../../navigation/modules'
import { moduleStatus } from '../../navigation/navigation.presentation'
</script>

<template>
  <NavigationShell>
    <header class="rounded-3xl bg-sand p-6 compact:p-8">
      <p class="mt-0 mb-3 text-sm font-semibold text-body">{{ moduleStatus(modules.tools) }}</p>
      <h1 class="m-0 text-3xl font-bold tracking-tight text-ink">裁判工具</h1>
      <p class="mt-4 mb-0 text-base leading-relaxed text-body">场边记录与实用查询。当前可使用本地比赛工作台，无需登录。</p>
    </header>
    <section class="mt-8" aria-labelledby="tools-list">
      <h2 id="tools-list" class="mt-0 mb-4 text-xl text-ink">工具目录</h2>
      <div class="grid grid-cols-[minmax(0,1fr)] gap-4 compact:grid-cols-2"><ModuleCard v-for="id in toolEntries" :key="id" :module="modules[id]" /></div>
    </section>
    <LocalWorkbenchNotice><p class="mt-3 mb-0">工具提示不替代裁判最终判断；规则参数由使用者明确配置，不代表完整复现某一竞赛规则体系。</p></LocalWorkbenchNotice>
  </NavigationShell>
</template>
