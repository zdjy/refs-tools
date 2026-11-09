import { ref, shallowRef } from 'vue'
import { certificationErrorMessage, certificationLoadErrorMessage } from './certifications.presentation'

/**
 * 认证写操作的生命周期：忙碌期间拒绝重入；每次开始先清空 `done` 再赋值，
 * 让连续两次相同的成功结果仍各触发一次通知。写操作不自动重试，失败只保留错误文案。
 */
export function useCertificationAction() {
  const busy = ref(false)
  const error = ref('')
  const done = ref('')

  async function run(work: () => Promise<void>, success: string): Promise<boolean> {
    if (busy.value) return false
    busy.value = true
    error.value = ''
    done.value = ''
    try {
      await work()
      done.value = success
      return true
    } catch (cause) {
      error.value = certificationErrorMessage(cause)
      return false
    } finally { busy.value = false }
  }
  function reset() { error.value = ''; done.value = '' }
  return { busy, error, done, run, reset }
}

/**
 * 可重试读取。请求序号防止切换记录、翻页与重试交错时旧响应覆盖新结果；
 * 刷新失败保留旧数据并说明，不把失败伪装成空列表。
 */
export function useCertificationLoadable<T>(loader: () => Promise<T>) {
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
      if (current === request) error.value = certificationLoadErrorMessage(cause)
      return false
    } finally { if (current === request) loading.value = false }
  }
  function clear() { request++; data.value = null; loading.value = false; error.value = '' }
  return { data, loading, error, load, clear }
}
