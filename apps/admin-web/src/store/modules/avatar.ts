import { ref } from 'vue';
import { defineStore } from 'pinia';
import { avatarApi, type AvatarApi } from '../../api/system/avatar';

/**
 * 头像读授权只在内存中缓存，键为媒体 ID。
 * 签名 URL 有效期短且禁止持久化，刷新页面或换账号后重新签名是预期行为。
 */
export function createAvatarState(api: Pick<AvatarApi, 'readUrl'> = avatarApi) {
  const urls = new Map<string, string>();
  const url = ref('');
  let revision = 0;

  /** 签名失败按「无头像」降级，界面回落到昵称首字符，不弹错误。 */
  async function ensure(mediaId: string | null | undefined): Promise<void> {
    const current = ++revision;
    if (!mediaId) { url.value = ''; return; }
    const cached = urls.get(mediaId);
    if (cached) { url.value = cached; return; }
    try {
      const authorization = await api.readUrl(mediaId);
      urls.set(mediaId, authorization.url);
      if (current === revision) url.value = authorization.url;
    } catch {
      if (current === revision) url.value = '';
    }
  }

  /** 退出登录后丢弃全部签名，避免下一个账号看到上一位的头像。 */
  function reset(): void {
    revision += 1;
    urls.clear();
    url.value = '';
  }

  return { url, ensure, reset };
}

export const useAvatarStore = defineStore('app-avatar', () => createAvatarState());
