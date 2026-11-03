<script setup lang="ts">
import { ArrowUpRight, ChevronDown } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import NavigationIcon from '../../../components/navigation/NavigationIcon.vue'
import { moduleGroups, modules } from '../../../navigation/modules'
import { moduleStatus } from '../../../navigation/navigation.presentation'
</script>

<template>
  <details class="group mt-10 rounded-2xl border border-solid border-line bg-surface px-5 compact:mt-14 compact:px-7">
    <summary class="flex min-h-20 cursor-pointer list-none items-center justify-between gap-4 rounded-full py-4 transition-all duration-300 active:scale-[.98] [&::-webkit-details-marker]:hidden">
      <span><span class="block text-lg font-bold text-ink">全部功能</span><span class="mt-1 block text-xs leading-relaxed text-body">学习备考、资质协作、场边工具与社区</span></span><ChevronDown class="size-5 shrink-0 text-body transition-transform duration-300 group-open:rotate-180" aria-hidden="true" />
    </summary>
    <div class="grid gap-6 border-0 border-t border-solid border-line pt-6 pb-5 compact:grid-cols-2 lg:grid-cols-3">
      <section v-for="group in moduleGroups" :key="group.title" :aria-label="group.title">
        <h2 class="mt-0 mb-3 text-sm font-semibold text-body">{{ group.title }}</h2>
        <RouterLink v-for="id in group.items" :key="id" :to="modules[id].path" class="flex min-h-16 items-center gap-3 rounded-2xl px-2 py-2 text-ink no-underline transition-all duration-300 hover:bg-soft active:scale-[.98]">
          <NavigationIcon :name="id" class="size-5 shrink-0 text-body" /><span class="min-w-0 grow"><span class="block text-sm font-medium">{{ modules[id].title }}</span><span class="mt-1 block text-xs text-body">{{ moduleStatus(modules[id]) }}</span></span><ArrowUpRight class="size-4 shrink-0 text-body" aria-hidden="true" />
        </RouterLink>
      </section>
    </div>
  </details>
</template>
