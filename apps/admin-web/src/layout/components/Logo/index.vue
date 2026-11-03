<template>
  <RouterLink to="/" class="flex h-16 items-center justify-center gap-2 overflow-hidden whitespace-nowrap text-base font-bold no-underline" aria-label="裁判工具平台管理端首页">
    <span class="grid size-11 shrink-0 place-items-center rounded-2xl bg-ink text-sm text-surface" aria-hidden="true">裁</span>
    <span v-show="!collapsed">裁判工具平台</span>
  </RouterLink>
</template>

<script lang="ts" setup>
import { RouterLink } from 'vue-router'
defineProps<{ collapsed: boolean }>()
</script>
