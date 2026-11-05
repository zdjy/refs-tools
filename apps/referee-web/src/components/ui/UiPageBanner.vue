<script setup lang="ts">
/**
 * 页面头部：iOS 大标题样式，标题、一句说明与状态标签，无底色、无分隔线与装饰图形（docs/ui/courtside.md §5）。
 * 无业务含义，文案与操作由页面传入。状态由文字加色点共同表达，不单靠颜色。
 */
withDefaults(defineProps<{ title: string; description?: string; status?: string; tone?: 'available' | 'planned'; compact?: boolean; titleId?: string }>(), { tone: 'planned' })
const dot = { available: 'bg-green', planned: 'bg-muted' } as const
</script>

<template>
  <header :aria-labelledby="titleId" :class="compact ? 'pb-1' : 'pb-2'">
    <h1 :id="titleId" class="m-0 text-[32px] leading-[1.15] font-bold tracking-[-0.025em] text-ink focus:outline-hidden compact:text-[40px]">{{ title }}</h1>
    <p v-if="description" class="mt-3 mb-0 max-w-[38em] leading-[1.7] text-body" :class="compact ? 'text-sm' : 'text-base'">{{ description }}</p>
    <p v-if="status" class="mt-4 mb-0">
      <span class="inline-flex min-h-8 items-center gap-2 rounded-full border border-solid border-line bg-surface/70 px-3 text-[13px] font-medium text-ink">
        <span class="size-2 rounded-full" :class="dot[tone]" aria-hidden="true"></span>{{ status }}
      </span>
    </p>
    <slot />
    <div v-if="$slots.actions" class="mt-5 flex flex-wrap gap-3"><slot name="actions" /></div>
  </header>
</template>
