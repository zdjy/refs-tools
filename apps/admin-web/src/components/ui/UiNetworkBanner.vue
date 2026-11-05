<script setup lang="ts">
  import { computed } from 'vue';
  import { useNetworkStatus } from './useNetworkStatus';

  const { status, recovered } = useNetworkStatus();

  /** 网络状态的就近说明；操作结果仍以各页面的加载、错误与重试为准。 */
  const copy = computed(() => {
    if (status.value === 'offline') return { tone: 'warn', text: '当前离线，暂不能读取或提交。输入内容会保留，恢复网络后再试。' };
    if (status.value === 'stalled') return { tone: 'warn', text: '请求长时间未响应，网络可能不稳定。可继续等待，或稍后重试。' };
    if (status.value === 'slow') return { tone: 'info', text: '网络较慢，仍在尝试连接…' };
    if (recovered.value) return { tone: 'ok', text: '网络已恢复。' };
    return null;
  });
</script>

<template>
  <!-- 区域常驻 DOM，使读屏软件在文案出现时播报；固定在视口底部，不占用文档流，不遮挡吸顶头部。 -->
  <div role="status" aria-live="polite" class="pointer-events-none fixed inset-x-0 bottom-4 z-[6000] flex justify-center px-3 empty:hidden">
    <p
      v-if="copy"
      data-testid="network-banner"
      :data-status="status"
      class="pointer-events-auto m-0 flex min-h-11 max-w-[560px] items-center justify-center rounded border border-solid border-admin-line bg-admin-surface-raised px-4 py-2 text-center text-[13px] leading-relaxed text-admin-ink shadow-lg"
      :class="copy.tone === 'warn' ? 'border-l-4 border-l-admin-warning' : copy.tone === 'ok' ? 'border-l-4 border-l-admin-success' : ''"
    >{{ copy.text }}</p>
  </div>
</template>
