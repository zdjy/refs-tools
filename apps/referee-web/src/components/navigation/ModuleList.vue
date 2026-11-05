<script setup lang="ts">
import { modules, type ModuleId } from '../../navigation/modules'
import ModuleCard from './ModuleCard.vue'

defineProps<{ ids: readonly ModuleId[]; numbered?: boolean }>()
</script>

<template>
  <!-- 平铺列表：不套卡片，上下各一条细线，行间缩进细线从图标右侧开始；行悬停用半透明底，背景动效仍可透出。 -->
  <ul class="m-0 list-none border-0 border-y border-solid border-line p-0">
    <li v-for="(id, index) in ids" :key="id" :style="{ animationDelay: `${Math.min(index, 6) * 60}ms` }" class="relative animate-rise [&:not(:first-child)]:before:absolute [&:not(:first-child)]:before:top-0 [&:not(:first-child)]:before:right-0 [&:not(:first-child)]:before:left-[56px] [&:not(:first-child)]:before:h-px [&:not(:first-child)]:before:bg-line">
      <ModuleCard :module="modules[id]" v-bind="numbered ? { order: index + 1 } : {}" />
    </li>
  </ul>
</template>
