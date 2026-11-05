<script setup lang="ts">
import { computed, toRef } from 'vue'
import { NButton } from 'naive-ui'
import UiSkeleton from './UiSkeleton.vue'
import { useLoadingPhase } from './useLoadingPhase'

/**
 * 首次加载区：短请求不显示，随后以静态骨架占位，较慢时补充说明，
 * 长时间无响应时给出「重试」入口。加载完成后由页面自己的内容替换本组件。
 */
const props = withDefaults(defineProps<{ loading: boolean; label?: string; lines?: number }>(), { label: '正在加载', lines: 4 })
const emit = defineEmits<{ retry: [] }>()
const phase = useLoadingPhase(toRef(props, 'loading'))
const showSkeleton = computed(() => phase.value !== 'idle' && phase.value !== 'pending')
</script>

<template>
  <div v-if="showSkeleton" class="grid gap-4">
    <UiSkeleton :label="label" :lines="lines" />
    <p v-if="phase === 'slow'" role="status" class="m-0 text-[13px] leading-[1.7] text-body">网络较慢，仍在{{ label }}…</p>
    <div v-else-if="phase === 'stalled'" role="status" class="flex flex-wrap items-center gap-3">
      <p class="m-0 text-[13px] leading-[1.7] text-body">长时间未响应，网络可能不稳定。可继续等待，或重新发起。</p>
      <n-button secondary @click="emit('retry')">重新加载</n-button>
    </div>
  </div>
</template>
