import { ref, shallowRef } from 'vue'
import { organizationsErrorMessage, organizationsLoadErrorMessage } from './organizations.presentation'

/**
 * 写操作的生命周期：忙碌期间拒绝重入；每次开始先清空 `done` 再赋值，
 * 因此连续两次相同的成功文案也会让同步观察者各触发一次（见前端规约「逐次而非重复通知」）。
 * 写操作永不自动重试，失败只留下错误文案，输入由调用方保留。
 * `success` 可以是函数：文案取决于服务端返回时（例如凭邀请码创建的组织直接启用），在写入成功后再取文案。
 */
export function useAction() {
  const busy = ref(false)
  const error = ref('')
  const done = ref('')

  async function run(work: () => Promise<void>, success: string | (() => string)): Promise<boolean> {
    if (busy.value) return false
    busy.value = true
    error.value = ''
    done.value = ''
    try {
      await work()
      done.value = typeof success === 'function' ? success() : success
      return true
    } catch (cause) {
      error.value = organizationsErrorMessage(cause)
      return false
    } finally { busy.value = false }
  }
  function reset() { error.value = ''; done.value = '' }
  return { busy, error, done, run, reset }
}

/**
 * 可重试读取。`request` 序号保证旧响应不会覆盖新结果（切换组织、翻页、重试交错时）；
 * 刷新保留旧数据，失败时用 `error` 说明，不把失败伪装成空列表。
 */
export function useLoadable<T>(loader: () => Promise<T>) {
  const data = shallowRef<T | null>(null)
  const loading = ref(false)
  const error = ref('')
  let request = 0

  async function load(): Promise<boolean> {
    const current = ++request
    loading.value = true
    error.value = ''
    try {
      const result = await loader()
      if (current !== request) return false
      data.value = result
      return true
    } catch (cause) {
      if (current === request) error.value = organizationsLoadErrorMessage(cause)
      return false
    } finally { if (current === request) loading.value = false }
  }
  /** 丢弃在途响应并清空数据，用于切换组织或离开页面。 */
  function clear() { request++; data.value = null; loading.value = false; error.value = '' }
  return { data, loading, error, load, clear }
}
