<script setup lang="ts">
defineProps<{ target?: string }>()
</script>

<template>
  <a :href="target ?? '#main'" class="sr-only fixed top-2 left-2 z-50 min-h-11 min-w-11 items-center rounded-full bg-ink px-5 py-3 text-surface no-underline focus:not-sr-only focus:inline-flex">跳到主内容</a>
</template>
