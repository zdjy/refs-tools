import { onScopeDispose, readonly, ref } from 'vue'
import { bindOnlineEvents, networkMonitor, type NetworkMonitor } from '../../infrastructure/network/network-monitor'
import { networkStatus, shouldAnnounceRecovery, type NetworkStatus } from '../../infrastructure/network/network-status'

/**
 * 订阅请求监视器并按 1 秒节拍重算网络档位（慢 / 卡顿由耗时决定，没有事件可订阅）。
 * `recovered` 在离线恢复或慢速请求成功后短暂为 true，供横幅给出「已恢复」的提示。
 */
export function useNetworkStatus(monitor: NetworkMonitor = networkMonitor, now: () => number = Date.now) {
  const status = ref<NetworkStatus>(networkStatus(monitor.snapshot(), now()))
  const recovered = ref(false)
  let hideTimer: ReturnType<typeof setTimeout> | undefined

  function recompute() {
    const snapshot = monitor.snapshot()
    const next = networkStatus(snapshot, now())
    if (next === status.value) return
    if (shouldAnnounceRecovery(status.value, next, snapshot.lastOutcome)) {
      recovered.value = true
      clearTimeout(hideTimer)
      hideTimer = setTimeout(() => { recovered.value = false }, 3000)
    } else if (next !== 'online') {
      recovered.value = false
    }
    status.value = next
  }

  const unsubscribe = monitor.subscribe(recompute)
  const unbind = typeof window === 'undefined' ? () => {} : bindOnlineEvents(monitor, window)
  const tick = setInterval(recompute, 1000)
  onScopeDispose(() => { unsubscribe(); unbind(); clearInterval(tick); clearTimeout(hideTimer) })
  return { status: readonly(status), recovered: readonly(recovered) }
}
