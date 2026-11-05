<script setup lang="ts">
import { Sparkles } from '@lucide/vue'
import { useBackdropMotion } from './useBackdropMotion'

/** 背景动效开关。compact 为纯图标按钮（手机顶栏），否则带文字（桌面侧栏）。 */
defineProps<{ compact?: boolean }>()
const { enabled, toggle } = useBackdropMotion()
</script>

<template>
  <button type="button" :aria-pressed="enabled" :aria-label="compact ? (enabled ? '暂停背景动效' : '开启背景动效') : undefined" class="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border-0 bg-transparent px-3 text-[15px] font-medium text-body transition-colors duration-200 ease-out hover:bg-canvas hover:text-ink active:scale-[.97]" :class="compact ? 'justify-center px-0' : 'w-full'" @click="toggle">
    <Sparkles class="size-[18px] shrink-0" :class="enabled ? 'text-accent-hover' : ''" :stroke-width="1.5" aria-hidden="true" />
    <template v-if="!compact">
      <span class="grow text-left">背景动效</span>
      <span class="text-[13px]" :class="enabled ? 'text-accent-hover' : 'text-body'">{{ enabled ? '开' : '关' }}</span>
    </template>
  </button>
</template>
