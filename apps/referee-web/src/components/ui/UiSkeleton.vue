<script setup lang="ts">
/**
 * 静态骨架占位：纯色块，无闪烁 / 脉冲动画（共享 UI 基线禁止装饰性动效）。
 * 行高与真实内容接近以避免加载完成后的布局位移；对读屏仅暴露一次加载说明。
 */
withDefaults(defineProps<{ lines?: number; label?: string }>(), { lines: 4, label: '正在加载' })
</script>

<template>
  <div role="status" :aria-label="label" class="grid gap-4" data-testid="skeleton">
    <span v-for="n in lines" :key="n" aria-hidden="true" class="block h-11 rounded-xl bg-soft" :class="n === 1 ? 'w-2/5' : 'w-full'"></span>
  </div>
</template>
