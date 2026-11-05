import { validateMediaPolicy } from '@refs-tools/domain'
import type { MediaObject, UploadIntentBody, UploadIntentResult } from '@refs-tools/contracts/media'

export type UploadState = { status: 'idle' | 'authorizing' | 'uploading' | 'verifying' | 'available' | 'failed'; fileName: string | null; mediaId: string | null; error: string | null }
export type UploadOptions = Omit<UploadIntentBody, 'contentType' | 'sizeBytes' | 'fileName'>
export type DirectUploadApi = {
  create(body: UploadIntentBody, key: string): Promise<UploadIntentResult>
  renew(id: string): Promise<UploadIntentResult>
  complete(id: string): Promise<Pick<MediaObject, 'id' | 'status'>>
  put(file: File, intent: UploadIntentResult, signal: AbortSignal): Promise<void>
}

/** 页面内存中的上传用例，不持久化文件、私密对象或签名；generation 防止取消后的旧响应覆盖新操作。 */
export function createDirectUpload(api: DirectUploadApi, changed: (state: UploadState) => void = () => {}) {
  let state: UploadState = { status: 'idle', fileName: null, mediaId: null, error: null }
  let file: File | null = null
  let options: UploadOptions | null = null
  let intent: UploadIntentResult | null = null
  let key = ''
  let generation = 0
  let controller: AbortController | null = null
  const update = (patch: Partial<UploadState>) => { state = { ...state, ...patch }; changed({ ...state }) }

  async function run(retry: boolean) {
    if (!file || !options || ['authorizing', 'uploading', 'verifying'].includes(state.status)) return
    const current = ++generation
    controller = new AbortController()
    const selected = file
    const body = { ...options, fileName: selected.name, contentType: selected.type, sizeBytes: selected.size }
    update({ status: 'authorizing', error: null })
    try {
      if (validateMediaPolicy(body)) throw new Error('文件类型或大小不符合上传要求。请选择其他文件。')
      if (retry && intent) {
        update({ status: 'verifying' })
        try {
          const result = await api.complete(intent.mediaId)
          if (current !== generation) return
          if (result.status === 'available') { update({ status: 'available', mediaId: result.id }); intent = null; file = null; return }
        } catch (error) {
          if (current !== generation) return
          const code = (error as { code?: string }).code
          if (code && !['OBJECT_NOT_FOUND', 'NETWORK_ERROR', 'OFFLINE'].includes(code)) throw error
        }
      }
      const authorized = intent && Date.parse(intent.upload.expiresAt) > Date.now() + 1000 ? intent
        : intent ? await api.renew(intent.mediaId) : await api.create(body, key)
      if (current !== generation) return
      intent = authorized
      update({ status: 'uploading', mediaId: intent.mediaId })
      await api.put(selected, intent, controller.signal)
      if (current !== generation) return
      update({ status: 'verifying' })
      const result = await api.complete(intent.mediaId)
      if (current !== generation) return
      if (result.status !== 'available') throw new Error('文件尚未通过核验，请重试。')
      update({ status: 'available', mediaId: result.id }); intent = null; file = null
    } catch { if (current === generation) update({ status: 'failed', error: '上传未完成。文件仍保留在当前页面，可检查网络后重试或重新选择。' }) }
  }

  return {
    snapshot: () => ({ ...state }),
    async start(selected: File, input: UploadOptions) {
      generation++; controller?.abort(); file = selected; options = input; intent = null; key = crypto.randomUUID()
      update({ status: 'idle', fileName: selected.name, mediaId: null, error: null })
      await run(false)
    },
    retry: () => run(true),
    cancel() { generation++; controller?.abort(); file = null; intent = null; options = null; update({ status: 'idle', fileName: null, mediaId: null, error: null }) },
  }
}
