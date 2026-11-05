<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ChevronRight } from '@lucide/vue'
import type { NavigationModule } from '../../navigation/modules'
import { moduleStatus, moduleTileClass } from '../../navigation/navigation.presentation'
import NavigationIcon from './NavigationIcon.vue'
const props = defineProps<{ module: NavigationModule; order?: number }>()
// 平铺列表中的一行：行与行之间用缩进分隔线，不再带卡片底色。
// 可用性由状态文字和色点表达（绿点可用、灰点建设中），图标块始终保持实色。
const ready = computed(() => props.module.availability !== 'planned')
</script>

<template>
  <RouterLink :to="module.path" class="group flex min-h-[72px] min-w-0 items-center gap-4 px-1 py-3 text-ink no-underline transition-colors duration-200 ease-out hover:bg-surface/70 active:bg-surface">
    <span class="grid size-9 shrink-0 place-items-center rounded-lg transition-transform duration-300 ease-(--ease-spring) group-hover:scale-105" :class="moduleTileClass(module)"><NavigationIcon :name="module.id" class="size-5" /></span>
    <span class="min-w-0 grow">
      <span class="flex items-baseline gap-2 text-[17px] leading-snug font-semibold"><span v-if="order" class="font-mono text-[13px] font-medium text-body" aria-hidden="true">{{ String(order).padStart(2, '0') }}</span>{{ module.title }}</span>
      <span class="mt-0.5 block text-sm leading-[1.5] wrap-anywhere text-body">{{ module.description }}</span>
      <span class="mt-1.5 flex items-center gap-2 text-[13px] font-medium text-body">
        <span class="size-2 rounded-full" :class="ready ? 'bg-green' : 'bg-muted'" aria-hidden="true"></span>{{ moduleStatus(module) }}
      </span>
    </span>
    <ChevronRight class="size-5 shrink-0 text-facet transition-transform duration-300 ease-(--ease-spring) group-hover:translate-x-1 group-hover:text-body" :stroke-width="2" aria-hidden="true" />
  </RouterLink>
</template>
