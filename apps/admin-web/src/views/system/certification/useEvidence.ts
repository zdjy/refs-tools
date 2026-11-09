import { ref } from 'vue';
import { certificationsApi } from '../../../api/system/certifications';
import { errorMessage } from './certifications.presentation';
/** 短时签名仅留内存，关闭和切换时使在途响应失效。 */
export function useEvidence(api = certificationsApi) {
  const url = ref(''), error = ref(''), loading = ref(false), mediaId = ref('');
  let sequence = 0;
  async function open(recordId: string, id: string, appealId?: string) {
    const current = ++sequence; mediaId.value = id; url.value = ''; error.value = ''; loading.value = true;
    try { const result = await api.evidence(recordId, id, appealId); if (current === sequence) url.value = result.url; }
    catch (cause) { if (current === sequence) error.value = errorMessage(cause); }
    finally { if (current === sequence) loading.value = false; }
  }
  function close() { sequence++; mediaId.value = ''; url.value = ''; error.value = ''; loading.value = false; }
  return { url, error, loading, mediaId, open, close };
}
