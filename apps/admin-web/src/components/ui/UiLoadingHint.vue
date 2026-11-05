<script setup lang="ts">
  import { toRef } from 'vue';
  import { NButton } from 'naive-ui';
  import { useLoadingPhase } from './useLoadingPhase';

  /** 列表读取的慢速说明；表格自身保留 NDataTable 的 loading，这里只补充耗时分级与重试入口。 */
  const props = defineProps<{ loading: boolean; label?: string }>();
  const emit = defineEmits<{ retry: [] }>();
  const phase = useLoadingPhase(toRef(props, 'loading'));
</script>

<template>
  <p v-if="phase === 'slow'" role="status" class="m-0 mb-3 text-[13px] text-admin-body">网络较慢，仍在{{ label ?? '加载' }}…</p>
  <div v-else-if="phase === 'stalled'" role="status" class="mb-3 flex flex-wrap items-center gap-3">
    <p class="m-0 text-[13px] text-admin-body">长时间未响应，网络可能不稳定。可继续等待，或重新发起。</p>
    <NButton size="large" @click="emit('retry')">重新加载</NButton>
  </div>
</template>
