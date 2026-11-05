<script setup lang="ts">
import { computed } from 'vue'
import { RefreshCw } from '@lucide/vue'
import { NButton } from 'naive-ui'
import { useAppUpdate } from './useAppUpdate'

const { updateReady, dismissed, dismiss, apply } = useAppUpdate()
const visible = computed(() => updateReady.value && !dismissed.value)
</script>

<template>
  <!-- 常驻 DOM 的状态区，使读屏软件在出现时播报；固定在顶部下方，不占文档流，也不遮挡移动底栏。 -->
  <div role="status" aria-live="polite" class="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-3 empty:hidden">
    <div v-if="visible" class="pointer-events-auto flex max-w-[560px] flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-xl border border-solid border-line bg-surface px-4 py-2 text-[13px] leading-[1.6] text-ink shadow-lift">
      <RefreshCw class="size-4 shrink-0 text-body" aria-hidden="true" />
      <span>有新版本可用。更新会刷新页面，已保存的比赛记录不受影响，撤销历史会清空。</span>
      <span class="flex gap-2">
        <n-button secondary @click="apply">立即更新</n-button>
        <n-button quaternary @click="dismiss">稍后</n-button>
      </span>
    </div>
  </div>
</template>
