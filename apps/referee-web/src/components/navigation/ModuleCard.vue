<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowUpRight } from '@lucide/vue'
import type { NavigationModule } from '../../navigation/modules'
import { moduleStatus } from '../../navigation/navigation.presentation'
import NavigationIcon from './NavigationIcon.vue'
const props = defineProps<{ module: NavigationModule }>()
// 建设中的模块用平铺底、无抬升，与可用模块拉开层级；状态文字始终保留，不单靠视觉差异传达。
const ready = computed(() => props.module.availability !== 'planned')
</script>

<template>
  <RouterLink :to="module.path" class="group flex min-w-0 flex-col rounded-xl border border-solid p-5 text-ink no-underline transition-all duration-200 ease-out active:scale-[.98] compact:p-6" :class="ready ? 'border-line bg-surface shadow-card hover:-translate-y-0.5 hover:shadow-lift' : 'border-line bg-soft hover:bg-sand'">
    <div class="flex items-start justify-between gap-3">
      <span class="grid size-12 place-items-center rounded-xl" :class="ready ? 'bg-sand text-ink' : 'bg-surface text-body'"><NavigationIcon :name="module.id" class="size-6" /></span>
      <ArrowUpRight class="size-5 text-body transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-red" :stroke-width="1.5" aria-hidden="true" />
    </div>
    <h3 class="text-ink mt-5 mb-2 text-lg font-bold tracking-tight">{{ module.title }}</h3>
    <p class="m-0 grow text-sm leading-relaxed wrap-anywhere text-body">{{ module.description }}</p>
    <p class="mt-5 mb-0 flex items-center gap-2 text-xs font-medium text-ink">
      <span class="size-2 rounded-full" :class="ready ? 'bg-green' : 'bg-muted'" aria-hidden="true"></span>{{ moduleStatus(module) }}
    </p>
  </RouterLink>
</template>
