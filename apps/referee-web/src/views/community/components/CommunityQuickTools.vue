<script setup lang="ts">
import { ArrowUpRight } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import NavigationIcon from '../../../components/navigation/NavigationIcon.vue'
import { modules } from '../../../navigation/modules'
import { moduleTileClass } from '../../../navigation/navigation.presentation'

// 场边最常用的两项排在页面最上方：工作台是主入口，区位码是辅助查询。
const tools = [modules.workbench, modules.gb2312] as const
</script>

<template>
  <!-- 快捷入口条：不套卡片，上下两条细线夹住两个入口，中间用竖线分开；手机上说明文字留给目标页。 -->
  <section class="mb-6 compact:mb-8" aria-labelledby="quick-tools-title">
    <h2 id="quick-tools-title" class="sr-only">场边工具</h2>
    <div class="grid border-0 border-y border-solid border-line compact:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] compact:divide-x compact:divide-solid compact:divide-line">
      <RouterLink v-for="(tool, index) in tools" :key="tool.id" :to="tool.path" :style="{ animationDelay: `${index * 70}ms` }" class="group flex min-h-16 animate-rise items-center gap-3 px-1 py-3 text-ink no-underline transition-colors duration-200 ease-out hover:bg-surface/70 active:bg-surface compact:min-h-[84px] compact:gap-4 compact:px-4 compact:first:pl-1" :class="index > 0 ? 'border-0 border-t border-solid border-line compact:border-t-0' : ''">
        <span class="grid size-10 shrink-0 place-items-center rounded-lg transition-transform duration-300 ease-(--ease-spring) group-hover:scale-105 compact:size-12" :class="moduleTileClass(tool)"><NavigationIcon :name="tool.id" class="size-6" /></span>
        <span class="min-w-0 grow">
          <span class="flex items-center gap-2 text-[17px] leading-snug font-bold">{{ tool.title }}<span v-if="tool.beta" class="rounded-full border border-solid border-ink px-2 py-px text-[12px] font-semibold">Beta</span></span>
          <span class="mt-0.5 hidden text-[13px] leading-[1.5] text-body compact:block">{{ tool.description }}</span>
        </span>
        <ArrowUpRight class="size-5 shrink-0 text-body transition-transform duration-300 ease-(--ease-spring) group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ink" :stroke-width="1.75" aria-hidden="true" />
      </RouterLink>
    </div>
    <p class="mt-3 mb-0 px-1 text-[13px] leading-[1.7] text-body">工作台记录仅存当前设备，不自动同步。已加载的工作台可离线操作，首次离线打开暂不保证可用。</p>
  </section>
</template>
