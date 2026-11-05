<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import NavigationShell from '../../components/navigation/NavigationShell.vue'
import ModuleCard from '../../components/navigation/ModuleCard.vue'
import UiPageBanner from '../../components/ui/UiPageBanner.vue'
import { modules, relatedModules, type ModuleId } from '../../navigation/modules'
import { moduleStatus } from '../../navigation/navigation.presentation'
const props = defineProps<{ moduleId: ModuleId }>()
const module = computed(() => modules[props.moduleId])
const related = computed(() => relatedModules(props.moduleId))
</script>

<template>
  <NavigationShell>
    <UiPageBanner :title="module.title" title-id="module-title" description="此模块正在建设中，当前暂不可用。这里仅说明后续功能范围，尚未开放业务操作，也无需先登录。" :status="moduleStatus(module)">
      <template #actions>
        <RouterLink to="/" class="inline-flex min-h-11 min-w-11 items-center rounded-full bg-ink px-6 py-3 text-sm font-medium text-surface no-underline transition-all duration-200 hover:bg-black active:scale-95">返回社区</RouterLink>
      </template>
    </UiPageBanner>
    <section class="mt-8 rounded-xl border border-solid border-line bg-surface p-5 shadow-card compact:p-6" aria-labelledby="module-scope">
      <h2 id="module-scope" class="mt-0 mb-2 text-lg text-ink">后续功能范围</h2>
      <p class="m-0 text-sm leading-relaxed text-body">{{ module.description }}。</p>
    </section>
    <section class="mt-8" aria-labelledby="related-entries">
      <h2 id="related-entries" class="mt-0 mb-4 text-xl text-ink">相关入口</h2>
      <div class="grid grid-cols-[minmax(0,1fr)] gap-4 compact:grid-cols-2 xl:grid-cols-3"><ModuleCard v-for="id in related" :key="id" :module="modules[id]" /></div>
    </section>
  </NavigationShell>
</template>
