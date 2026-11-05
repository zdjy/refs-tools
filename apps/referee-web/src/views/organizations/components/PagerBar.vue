<script setup lang="ts">
import { NButton } from 'naive-ui'

/** 通用分页条：页码文本是 role=status，翻页读取期间两个按钮互斥，避免交错请求。 */
defineProps<{ page: number; pageCount: number; busy: boolean; label: string }>()
defineEmits<{ go: [page: number] }>()
</script>

<template>
  <nav v-if="pageCount > 1" :aria-label="label" class="flex items-center justify-between gap-3">
    <n-button secondary :disabled="page <= 1 || busy" @click="$emit('go', page - 1)">上一页</n-button>
    <span class="text-sm tabular-nums text-body" role="status">第 {{ page }} / {{ pageCount }} 页</span>
    <n-button secondary :disabled="page >= pageCount || busy" @click="$emit('go', page + 1)">下一页</n-button>
  </nav>
</template>
