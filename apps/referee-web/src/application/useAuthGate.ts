import { onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../stores/auth'

/**
 * 登录态确认后才读取私有数据；匿名用户不发任何请求，由页面展示登录入口。
 * 会话到期或退出后状态变回 anonymous，页面据此隐藏已读取的数据。
 */
export function useAuthGate(load: () => unknown) {
  const auth = useAuthStore()
  const { status } = storeToRefs(auth)
  onMounted(() => { if (auth.status === 'unknown') void auth.restore() })
  watch(status, (value) => { if (value === 'authenticated') void load() }, { immediate: true })
  /** 登录态确认失败后的重试入口；强制重新读取会话。 */
  const retry = () => { void auth.restore(true) }
  return { status, retry }
}
