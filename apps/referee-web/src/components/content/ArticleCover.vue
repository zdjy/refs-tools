<script setup lang="ts">
import type { CoverMotif } from '../../content/editorial'
import { coverMotifs, coverPartClass } from './cover.presentation'

defineProps<{ motif: CoverMotif }>()
</script>

<template>
  <!-- 装饰性插图：标题已由相邻文本提供，不重复朗读。 -->
  <svg class="block size-full" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
    <rect width="400" height="300" class="fill-sand" />
    <path d="M150 0H400V300H0Z" class="fill-facet" opacity=".85" />
    <path v-for="(part, index) in coverMotifs[motif]" :key="index" :d="part.d" :class="coverPartClass[part.kind]" stroke-width="2" :stroke-dasharray="part.kind === 'dash' ? '6 8' : undefined" stroke-linejoin="round" />
  </svg>
</template>
