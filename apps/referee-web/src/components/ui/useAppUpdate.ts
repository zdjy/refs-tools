import { readonly, ref } from 'vue'
import { registerShell, type SwHandle } from '../../infrastructure/pwa/register-sw'

const updateReady = ref(false)
const dismissed = ref(false)
let handle: SwHandle | null = null

/**
 * 在应用入口调用一次：生产环境注册外壳 Service Worker，并把“新版本已就绪”暴露为界面状态。
 * 开发服务器不注册，避免缓存的旧模块干扰热更新。
 */
export function startAppShell(): void {
  if (!import.meta.env.PROD || typeof navigator === 'undefined') return
  void registerShell(navigator.serviceWorker, () => { updateReady.value = true; dismissed.value = false }, () => location.reload())
    .then((result) => { handle = result })
}

/** 提示条使用：就绪状态、稍后再说与立即更新。 */
export function useAppUpdate() {
  return {
    updateReady: readonly(updateReady),
    dismissed: readonly(dismissed),
    dismiss: () => { dismissed.value = true },
    apply: () => handle?.applyUpdate(),
  }
}
