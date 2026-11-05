<script setup lang="ts">
import { Check } from '@lucide/vue'

/**
 * 通用分步指示器：圆形序号 + 标题 + 说明，已完成步骤改用勾选标记。
 * 只做展示，不提供点击跳转——跳过未完成的步骤会让后续提交缺少必要证明。
 */
defineProps<{ items: readonly { title: string; hint: string }[]; current: number; label: string }>()

const circleClass = (state: 'done' | 'active' | 'pending') => {
  if (state === 'active') return 'border-ink bg-ink text-surface'
  if (state === 'done') return 'border-line bg-soft text-ink'
  return 'border-line bg-surface text-body'
}
const titleClass = (state: 'done' | 'active' | 'pending') => {
  if (state === 'active') return 'text-ink font-semibold'
  if (state === 'done') return 'text-ink'
  return 'text-body'
}
</script>

<template>
  <ol class="m-0 flex list-none items-center gap-2 p-0" :aria-label="label">
    <li v-for="(item, i) in items" :key="item.title" class="flex min-w-0 flex-1 items-center gap-2 sm:flex-none"
      :aria-current="i === current ? 'step' : undefined">
      <span class="grid size-6 shrink-0 place-items-center rounded-full border border-solid text-[12px] font-semibold"
        :class="circleClass(i < current ? 'done' : i === current ? 'active' : 'pending')" aria-hidden="true">
        <Check v-if="i < current" class="size-3.5" :stroke-width="2.5" />
        <template v-else>{{ i + 1 }}</template>
      </span>
      <!-- 窄屏只留圆点与连接线，文字仍保留给屏幕阅读器，避免标签被裁切或引入横向滚动。 -->
      <span class="sr-only sm:not-sr-only sm:grid sm:min-w-0 sm:gap-0.5">
        <span class="whitespace-nowrap text-[13px]" :class="titleClass(i < current ? 'done' : i === current ? 'active' : 'pending')">{{ item.title }}</span>
        <!-- 说明文字需要更多横向空间，只在宽屏出现，避免中等宽度下把指示器撑出卡片。 -->
        <span class="hidden text-[12px] whitespace-nowrap text-body lg:block">{{ item.hint }}</span>
      </span>
      <span v-if="i < items.length - 1" class="h-px min-w-3 flex-1" :class="i < current ? 'bg-ink' : 'bg-line'" aria-hidden="true"></span>
    </li>
  </ol>
</template>
