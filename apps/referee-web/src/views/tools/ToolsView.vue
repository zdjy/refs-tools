<script setup lang="ts">
import NavigationShell from '../../components/navigation/NavigationShell.vue'
import ModuleCard from '../../components/navigation/ModuleCard.vue'
import LocalWorkbenchNotice from '../../components/navigation/LocalWorkbenchNotice.vue'
import UiPageBanner from '../../components/ui/UiPageBanner.vue'
import { modules, toolEntries } from '../../navigation/modules'
import { moduleStatus } from '../../navigation/navigation.presentation'
</script>

<template>
  <NavigationShell>
    <UiPageBanner title="裁判工具" title-id="tools-title" description="场边记录与实用查询。可用工具无需登录，建设中的工具只展示后续范围。" :status="moduleStatus(modules.tools)" tone="available" />
    <section class="mt-8" aria-labelledby="tools-list">
      <h2 id="tools-list" class="mt-0 mb-4 text-xl text-ink">工具目录</h2>
      <div class="grid grid-cols-[minmax(0,1fr)] gap-4 compact:grid-cols-2 xl:grid-cols-3"><ModuleCard v-for="id in toolEntries" :key="id" :module="modules[id]" /></div>
    </section>
    <LocalWorkbenchNotice><p class="mt-3 mb-0">工具提示不替代裁判最终判断；规则参数由使用者明确配置，不代表完整复现某一竞赛规则体系。</p></LocalWorkbenchNotice>
  </NavigationShell>
</template>
