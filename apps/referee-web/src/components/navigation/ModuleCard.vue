<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ArrowRight } from '@lucide/vue'
import type { NavigationModule } from '../../navigation/modules'
import { moduleStatus } from '../../navigation/navigation.presentation'
import NavigationIcon from './NavigationIcon.vue'
defineProps<{ module: NavigationModule }>()
</script>

<template>
  <RouterLink :to="module.path" class="group flex min-w-0 flex-col rounded-xl border border-solid border-line bg-surface p-5 text-ink no-underline shadow-card transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lift active:scale-[.98] compact:p-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <NavigationIcon :name="module.id" class="size-7 text-body" />
      <span class="rounded-full bg-soft px-3 py-1 text-xs leading-relaxed text-body">{{ moduleStatus(module) }}</span>
    </div>
    <h3 class="mt-5 mb-2 text-lg font-bold tracking-tight group-hover:text-red">{{ module.title }}</h3>
    <p class="m-0 grow text-sm leading-relaxed wrap-anywhere text-body">{{ module.description }}</p>
    <div aria-hidden="true" class="mt-5 flex justify-end border-0 border-t border-solid border-line pt-3 text-body"><ArrowRight class="size-5 transition-transform duration-200 group-hover:translate-x-1" :stroke-width="1.5" /></div>
  </RouterLink>
</template>
