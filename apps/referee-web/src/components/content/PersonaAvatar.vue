<script setup lang="ts">
import type { SamplePersona } from '../../content/threads.sample'

defineProps<{ shape: SamplePersona['shape'] }>()
</script>

<template>
  <!-- 几何图形代替头像：示例角色没有真实人物，也不使用照片。 -->
  <svg class="size-11 shrink-0" viewBox="0 0 44 44" fill="none" aria-hidden="true">
    <circle cx="22" cy="22" r="22" class="fill-sand" />
    <circle v-if="shape === 'ring'" cx="22" cy="22" r="10" class="stroke-ink" stroke-width="3" />
    <path v-else-if="shape === 'half'" d="M12 22a10 10 0 0 1 20 0Z" class="fill-ink" />
    <g v-else-if="shape === 'dots'" class="fill-ink"><circle cx="15" cy="22" r="3.5" /><circle cx="29" cy="22" r="3.5" /></g>
    <path v-else-if="shape === 'bar'" d="M12 18h20v8H12Z" class="fill-ink" />
    <path v-else d="M12 32v-6h7v-6h7v-6h6v18Z" class="fill-ink" />
    <circle cx="33" cy="11" r="3" class="fill-accent" />
  </svg>
</template>
