import type { MediaObject, ReadAuthorization, UploadIntentBody, UploadIntentResult } from '@refs-tools/contracts/media'
import { HttpError } from './http/errors'
import { createObjectStorageClient, type ObjectStorageClient } from './http/object-storage-client'
import { createPlatformClient, type PlatformClient } from './http/platform-client'

/** 只公开可识别错误码，不将包含签名的网络异常体传给 UI 或日志。 */
export class MediaApiError extends Error {
  constructor(readonly code: string, readonly status: number) { super(code) }
}

/** 网关防腐层：HttpError 在此翻译为媒体上下文的错误码。 */
function toMediaError(error: unknown, fallback: string): MediaApiError {
  if (!(error instanceof HttpError)) return new MediaApiError(fallback, 0)
  if (error.kind === 'offline') return new MediaApiError('OFFLINE', 0)
  if (error.kind === 'network') return new MediaApiError('NETWORK_ERROR', 0)
  return new MediaApiError(error.code ?? 'MEDIA_SERVICE_UNAVAILABLE', error.status)
}

export function createMediaApi(platform: PlatformClient, storage: ObjectStorageClient) {
  const call = <T>(task: Promise<T>) =>
    task.catch((error) => { throw toMediaError(error, 'MEDIA_SERVICE_UNAVAILABLE') })
  return {
    create: (body: UploadIntentBody, key: string) =>
      call(platform.post<UploadIntentResult>('/media/upload-intents', body, { 'Idempotency-Key': key })),
    renew: (id: string) =>
      call(platform.post<UploadIntentResult>(`/media/${encodeURIComponent(id)}/upload-authorization`)),
    complete: (id: string) =>
      call(platform.post<MediaObject>(`/media/${encodeURIComponent(id)}/complete`, {})),
    /** 只申请短时读取授权；签名 URL 不写入日志、错误或缓存，由调用方在内存中使用。 */
    readUrl: (id: string) =>
      call(platform.get<ReadAuthorization>(`/media/${encodeURIComponent(id)}/read-url`)),
    /** 媒体字节直接发往存储；不读取或持久化签名 URL，也不携带平台 Cookie 和 Referer。 */
    async put(file: File, intent: UploadIntentResult, signal: AbortSignal): Promise<void> {
      if (new URL(intent.upload.url).protocol !== 'https:') throw new MediaApiError('INVALID_UPLOAD_URL', 0)
      let result: { status: number }
      try { result = await storage.put(intent.upload.url, file, intent.upload.headers, signal) }
      catch { throw new MediaApiError('UPLOAD_INTERRUPTED', 0) }
      // 409 表示对象已存在（x-oss-forbid-overwrite），视为同一上传已落盘，交由 complete 核验。
      if (result.status < 200 || result.status >= 300) {
        if (result.status !== 409) throw new MediaApiError('UPLOAD_FAILED', result.status)
      }
    },
  }
}

export const mediaApi = createMediaApi(createPlatformClient({ baseURL: '/api/v1' }), createObjectStorageClient())
export type MediaApi = typeof mediaApi
