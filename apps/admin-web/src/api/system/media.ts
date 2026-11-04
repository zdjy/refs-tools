import type { AdminMedia, AdminMediaList, AdminMediaOperation, AdminMediaQuery } from '@refs-tools/contracts/admin-media';
import type { ReadAuthorization } from '@refs-tools/contracts/media';
import { AdminApiError, platformClient, type PlatformClient } from '../http/platform-client';

/** 管理媒体错误只传播稳定错误码，不保留原始响应或签名 URL。 */
export class MediaApiError extends Error {
  constructor(readonly code: string, readonly status: number) { super(code); }
}

/** 媒体治理网关；下载授权仅交给当前下载动作，不缓存。 */
export function createMediaApi(client: PlatformClient) {
  async function call<T>(task: Promise<T>): Promise<T> {
    try { return await task; }
    catch (error) {
      if (error instanceof AdminApiError) throw new MediaApiError(error.code ?? (error.status === 0 ? 'NETWORK_ERROR' : 'SERVICE_UNAVAILABLE'), error.status);
      throw new MediaApiError('SERVICE_UNAVAILABLE', 0);
    }
  }
  const path = (id: string) => `/admin/media/${encodeURIComponent(id)}`;
  return {
    list: (query: AdminMediaQuery) => call(client.get<AdminMediaList>(`/admin/media?${new URLSearchParams(query)}`)),
    detail: (id: string) => call(client.get<AdminMedia>(path(id))),
    read: (id: string, input: AdminMediaOperation) => call(client.post<ReadAuthorization>(`${path(id)}/read-url`, input)),
    remove: (id: string, input: AdminMediaOperation) => call(client.delete<{ status: 'deleted' }>(path(id), input)),
  };
}
export const mediaApi = createMediaApi(platformClient);
export type MediaApi = typeof mediaApi;
