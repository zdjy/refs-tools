import { ref } from 'vue'
import { defineStore } from 'pinia'
import { profileApi, type ProfileApi } from '../api/profile.api'

/**
 * 头像读授权只在内存中缓存，键为媒体 ID。
 * 签名 URL 有效期短且禁止持久化，因此刷新页面或换账号后重新签名是预期行为。
 */
export function createAvatarState(api: Pick<ProfileApi, 'avatarUrl'> = profileApi) {
  const urls = new Map<string, string>()
  const url = ref('')
  const loading = ref(false)
  let revision = 0

  async function ensure(mediaId: string | null): Promise<void> {
    const current = ++revision
    if (!mediaId) { url.value = ''; loading.value = false; return }
    const cached = urls.get(mediaId)
    if (cached) { url.value = cached; loading.value = false; return }
    loading.value = true
    try {
      const authorization = await api.avatarUrl(mediaId)
      urls.set(mediaId, authorization.url)
      if (current === revision) url.value = authorization.url
    } catch {
      // 头像签名失败按“无头像”降级，不回退到错误提示，顶栏仍显示昵称首字符。
      if (current === revision) url.value = ''
    } finally {
      if (current === revision) loading.value = false
    }
  }

  /** 上传或移除头像后丢弃旧签名，避免继续展示已被替换的对象。 */
  function invalidate(mediaId?: string | null): void {
    if (mediaId) urls.delete(mediaId)
    else urls.clear()
    url.value = ''
  }

  return { url, loading, ensure, invalidate }
}

export const useAvatarStore = defineStore('avatar', () => createAvatarState())
