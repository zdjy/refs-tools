<script setup lang="ts">
import { NButton } from 'naive-ui'

/** 队列与本人记录共用的小分页：只在多页时出现，按钮保留 44px 触控高度。 */
defineProps<{ page: number; pageCount: number; busy?: boolean }>()
defineEmits<{ go: [page: number] }>()
</script>

<template>
  <nav v-if="pageCount > 1" class="flex flex-wrap items-center justify-between gap-3 border-0 border-t border-solid border-line pt-3" aria-label="分页">
    <p class="m-0 font-mono text-[13px] text-body">第 {{ page }} / {{ pageCount }} 页</p>
    <div class="flex gap-2">
      <n-button secondary size="small" :disabled="busy || page <= 1" @click="$emit('go', page - 1)">上一页</n-button>
      <n-button secondary size="small" :disabled="busy || page >= pageCount" @click="$emit('go', page + 1)">下一页</n-button>
    </div>
  </nav>
</template>
