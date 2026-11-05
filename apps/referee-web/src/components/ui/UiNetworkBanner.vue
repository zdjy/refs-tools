<script setup lang="ts">
import { computed } from 'vue'
import { Check, Clock, WifiOff } from '@lucide/vue'
import { useNetworkStatus } from './useNetworkStatus'

const { status, recovered } = useNetworkStatus()

/** 网络状态的就近说明；操作结果仍以各页面的加载、错误与重试为准。 */
const copy = computed(() => {
  if (status.value === 'offline') return { icon: WifiOff, tone: 'warn', text: '当前离线，暂不能读取或提交。输入内容会保留，恢复网络后再试。' }
  if (status.value === 'stalled') return { icon: Clock, tone: 'warn', text: '请求长时间未响应，网络可能不稳定。可继续等待，或稍后重试。' }
  if (status.value === 'slow') return { icon: Clock, tone: 'info', text: '网络较慢，仍在尝试连接…' }
  if (recovered.value) return { icon: Check, tone: 'ok', text: '网络已恢复。' }
  return null
})
</script>

<template>
  <!-- 区域常驻 DOM，使读屏软件在文案出现时播报；离线 / 卡顿为持续提示，不自动消失。
       固定在视口底部（移动端位于底栏上方），不参与文档流，因此不会与吸顶导航互相遮挡或造成布局位移。 -->
  <div role="status" aria-live="polite" class="pointer-events-none fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-50 flex justify-center px-3 empty:hidden tablet:bottom-4">
    <p v-if="copy" data-testid="network-banner" :data-status="status"
      class="pointer-events-auto m-0 flex min-h-11 max-w-[560px] items-center justify-center gap-2 rounded-xl border border-solid border-line px-4 py-2 text-center text-[13px] leading-[1.6] text-ink shadow-lift"
      :class="copy.tone === 'warn' ? 'bg-sand' : 'bg-soft'">
      <component :is="copy.icon" class="size-4 shrink-0" :class="copy.tone === 'ok' ? 'text-green' : 'text-body'" aria-hidden="true" />
      <span>{{ copy.text }}</span>
    </p>
  </div>
</template>
