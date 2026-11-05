<script setup lang="ts">
/**
 * 分组标题（iOS 分组列表的小标题）：左侧标题，右侧可选计数。
 * 标题用 body 色而非 muted，13px 下对比度 6.06:1；计数用等宽数字，便于纵向对齐。
 */
defineProps<{ title: string; count?: number; titleId?: string; level?: 2 | 3 }>()
</script>

<template>
  <div class="mb-1 flex items-baseline justify-between gap-3 px-1">
    <component :is="`h${level ?? 2}`" :id="titleId" class="m-0 text-[13px] font-semibold text-body">{{ title }}</component>
    <span v-if="count !== undefined" class="font-mono text-[13px] text-body" :aria-label="`共 ${count} 项`">{{ count }}</span>
  </div>
</template>
