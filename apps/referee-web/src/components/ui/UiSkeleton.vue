<script setup lang="ts">
/**
 * 骨架占位：纯色块加透明度呼吸动画（只动画 opacity，不用渐变）。各行错开 120ms 依次起伏。
 * 行高与真实内容接近以避免加载完成后的布局位移；对读屏仅暴露一次加载说明。
 * 系统开启“减弱动态效果”时，全局基线会让动画失效，色块保持静止。
 */
withDefaults(defineProps<{ lines?: number; label?: string }>(), { lines: 4, label: '正在加载' })
</script>

<template>
  <div role="status" :aria-label="label" class="grid gap-4" data-testid="skeleton">
    <span v-for="n in lines" :key="n" aria-hidden="true" class="block h-11 animate-breathe rounded-xl bg-soft" :class="n === 1 ? 'w-2/5' : 'w-full'" :style="{ animationDelay: `${(n - 1) * 120}ms` }"></span>
  </div>
</template>
