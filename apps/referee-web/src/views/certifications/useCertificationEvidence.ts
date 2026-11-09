import { ref, shallowRef } from 'vue'
import { certificationsApi, type CertificationsApi } from '../../api/certifications.api'
import { certificationDetailErrorMessage } from './certifications.presentation'

/**
 * 认证材料的短时读取授权。签名 URL 只留在内存，关闭弹窗即丢弃；
 * 请求序号保证快速切换材料时旧响应不会覆盖当前材料。
 */
export function useCertificationEvidence(api: CertificationsApi = certificationsApi) {
  const mediaId = ref<string | null>(null)
  const url = shallowRef('')
  const busy = ref(false)
  const error = ref('')
  let request = 0

  async function load(recordId: string, targetMediaId: string, appealId?: string) {
    const current = ++request
    mediaId.value = targetMediaId
    url.value = ''
    error.value = ''
    busy.value = true
    try {
      const authorization = appealId
        ? await api.appealEvidenceUrl(recordId, appealId, targetMediaId)
        : await api.evidenceUrl(recordId, targetMediaId)
      if (current === request) url.value = authorization.url
    } catch (cause) {
      if (current === request) error.value = certificationDetailErrorMessage(cause)
    } finally { if (current === request) busy.value = false }
  }
  function close() {
    request++
    mediaId.value = null
    url.value = ''
    error.value = ''
    busy.value = false
  }
  return { mediaId, url, busy, error, load, close }
}
