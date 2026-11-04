import type { MediaObject, UploadIntentBody, UploadIntentResult } from '@refs-tools/contracts/media'

/** 只公开可识别错误码，不将包含签名的网络异常体传给 UI 或日志。 */
export class MediaApiError extends Error {
  constructor(readonly code: string, readonly status: number) { super(code) }
}

async function request<T>(path: string, method: string, body?: unknown, key?: string): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api/v1/media/${path}`, { method, credentials: 'same-origin', cache: 'no-store',
      headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(key ? { 'Idempotency-Key': key } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000) })
  } catch { throw new MediaApiError('NETWORK_ERROR', 0) }
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new MediaApiError(payload?.error?.code ?? 'MEDIA_SERVICE_UNAVAILABLE', response.status)
  if (!payload?.data) throw new MediaApiError('MEDIA_SERVICE_UNAVAILABLE', response.status)
  return payload.data as T
}

export const mediaApi = {
  create: (body: UploadIntentBody, key: string) => request<UploadIntentResult>('upload-intents', 'POST', body, key),
  renew: (id: string) => request<UploadIntentResult>(`${encodeURIComponent(id)}/upload-authorization`, 'POST'),
  complete: (id: string) => request<MediaObject>(`${encodeURIComponent(id)}/complete`, 'POST', {}),
  /** 省略平台 Cookie 和 Referer，不读取或持久化签名 URL；媒体字节直接发往存储。 */
  async put(file: File, intent: UploadIntentResult, signal: AbortSignal): Promise<void> {
    const url = new URL(intent.upload.url)
    if (url.protocol !== 'https:') throw new MediaApiError('INVALID_UPLOAD_URL', 0)
    let response: Response
    try {
      response = await fetch(url, { method: 'PUT', body: file, headers: intent.upload.headers,
        credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', redirect: 'error', signal })
    } catch { throw new MediaApiError('UPLOAD_INTERRUPTED', 0) }
    if (!response.ok && response.status !== 409) throw new MediaApiError('UPLOAD_FAILED', response.status)
  },
}
