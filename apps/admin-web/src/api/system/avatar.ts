import type { ReadAuthorization } from '@refs-tools/contracts/media';
import { AdminApiError, platformClient, type PlatformClient } from '../http/platform-client';

/** 头像网关错误只传播稳定错误码，不保留原始响应或签名 URL。 */
export class AvatarApiError extends Error {
  constructor(readonly code: string, readonly status: number) { super(code); }
}

/**
 * 读取当前登录账号自己的头像。走本人媒体读授权而非 `/admin/media`：
 * 后者要求填写理由并写入审计，不适合每次进入页面都触发的顶栏头像。
 */
export function createAvatarApi(client: PlatformClient) {
  return {
    async readUrl(mediaId: string): Promise<ReadAuthorization> {
      try { return await client.get<ReadAuthorization>(`/media/${encodeURIComponent(mediaId)}/read-url`); }
      catch (error) {
        if (error instanceof AdminApiError) throw new AvatarApiError(error.code ?? (error.status === 0 ? 'NETWORK_ERROR' : 'SERVICE_UNAVAILABLE'), error.status);
        throw new AvatarApiError('SERVICE_UNAVAILABLE', 0);
      }
    },
  };
}
export const avatarApi = createAvatarApi(platformClient);
export type AvatarApi = typeof avatarApi;
