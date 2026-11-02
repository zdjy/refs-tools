<script setup lang="ts">
import type { ModuleId, NavigationSection } from '../../navigation/modules'
defineProps<{ name: ModuleId | NavigationSection }>()
const paths: Record<ModuleId | NavigationSection, string> = {
  home: 'm3 10 9-7 9 7v10H3V10Zm6 10v-7h6v7',
  learning: 'M12 5C9 3 5 3 3 4v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-2-1-6-1-9 1Zm0 0v15',
  tools: 'M14 5h6v6h-6V5ZM4 14h6v6H4v-6ZM4 5h6v6H4V5Zm10 9h6v6h-6v-6Z',
  forum: 'M4 4h16v12H9l-5 4V4Zm4 5h8M8 12h5',
  account: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 6 0 0 1 16 0v2',
  practice: 'm14 4 6 6-10 10H4v-6L14 4Zm-3 3 6 6',
  'wrong-questions': 'M6 3h12v18H6V3Zm3 5h6m-6 4h6m-6 4h3',
  exams: 'M8 4H5v17h14V4h-3M8 3h8v4H8V3Zm0 9 2 2 5-4m-7 8h7',
  results: 'M4 4v16h17M8 16v-5m5 5V8m5 8V5',
  certifications: 'm12 3 3 2 4 1v6l-7 5-7-5V6l4-1 3-2Zm-4 13-1 6 5-3 5 3-1-6m-7-6 2 2 4-4',
  organizations: 'M4 21V8l8-5 8 5v13M2 21h20M8 9h1m6 0h1m-8 4h1m6 0h1m-6 8v-4h4v4',
  events: 'M4 5h16v16H4V5Zm3-3v6m10-6v6M4 10h16m-11 5h6',
  workbench: 'M3 5h18v14H3V5Zm9 0v14M6 9h3m-3 5h3m6-5h3m-3 5h3',
  gb2312: 'M4 4h16v16H4V4Zm3 4h10m-5-2v3m-3 1c0 4 6 6 6 6m0-6c0 4-6 6-6 6',
}
</script>

<template>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="paths[name]" /></svg>
</template>
