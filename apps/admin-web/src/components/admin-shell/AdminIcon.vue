<script setup lang="ts">
  import { computed } from 'vue';
  import { iconPaths, type AdminIconName } from './icons';

  const props = withDefaults(defineProps<{ name: AdminIconName; size?: number; strokeWidth?: number }>(), {
    size: 16,
    strokeWidth: 1.75,
  });

  const inner = computed(() => iconPaths[props.name]);
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
    v-html="inner"
  />
</template>
