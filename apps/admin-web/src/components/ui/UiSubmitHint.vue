<script setup lang="ts">
  import { toRef } from 'vue';
  import { useLoadingPhase } from './useLoadingPhase';

  /**
   * 提交中的就近说明。写操作超时后服务端结果未知，因此慢速阶段告知「请勿重复提交」，
   * 长时间无响应时说明可能已生效、需核对而非盲目重试。
   */
  const props = defineProps<{ busy: boolean }>();
  const phase = useLoadingPhase(toRef(props, 'busy'));
</script>

<template>
  <p v-if="phase === 'slow'" role="status" class="m-0 text-[13px] text-admin-body">网络较慢，正在提交，请勿重复操作。</p>
  <p v-else-if="phase === 'stalled'" role="status" class="m-0 text-[13px] text-admin-body">
    提交时间较长，结果尚未返回。请先等待；若最终失败，请刷新确认是否已生效后再重试。
  </p>
</template>
