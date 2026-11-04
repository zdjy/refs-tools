import { onUnmounted, shallowRef } from 'vue'
import { mediaApi } from '../../api/media.api'
import { createDirectUpload, type DirectUploadApi, type UploadState } from './direct-upload'

/** Vue 只适配用例状态生命周期，路由离开时丢弃签名与文件内存，不隐式排队或持久化。 */
export function useMediaUpload(api: DirectUploadApi = mediaApi) {
  const state = shallowRef<UploadState>({ status: 'idle', fileName: null, mediaId: null, error: null })
  const upload = createDirectUpload(api, (value) => { state.value = value })
  onUnmounted(upload.cancel)
  return { state, start: upload.start, retry: upload.retry, cancel: upload.cancel }
}
