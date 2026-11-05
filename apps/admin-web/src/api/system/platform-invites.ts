import type {
  CreatePlatformInvite, PlatformInvite, PlatformInviteList, PlatformInviteQuery, RevokePlatformInvite,
} from '@refs-tools/contracts/platform-invites';
import { AdminApiError, platformClient, type PlatformClient } from '../http/platform-client';

/** 平台邀请码上下文错误；页面不依赖传输层或服务端异常文本。 */
export class PlatformInvitesApiError extends Error {
  constructor(readonly code: string, readonly status: number) { super(code); }
}

/** 创建响应带一次性明文，网关原样返回、不缓存也不记录。 */
export type CreatedPlatformInvite = { invite: PlatformInvite; token: string };

export function createPlatformInvitesApi(client: PlatformClient) {
  async function call<T>(task: Promise<T>): Promise<T> {
    try { return await task; }
    catch (error) {
      if (error instanceof AdminApiError) throw new PlatformInvitesApiError(error.code ?? (error.status === 0 ? 'NETWORK_ERROR' : 'SERVICE_UNAVAILABLE'), error.status);
      throw new PlatformInvitesApiError('SERVICE_UNAVAILABLE', 0);
    }
  }
  return {
    list: (query: PlatformInviteQuery) => call(client.get<PlatformInviteList>(`/admin/organization-invites?${new URLSearchParams(query as Record<string, string>)}`)),
    create: (input: CreatePlatformInvite) => call(client.post<CreatedPlatformInvite>('/admin/organization-invites', input)),
    revoke: (id: string, input: RevokePlatformInvite) => call(client.post<PlatformInvite>(`/admin/organization-invites/${encodeURIComponent(id)}/revoke`, input)),
  };
}
export const platformInvitesApi = createPlatformInvitesApi(platformClient);
export type PlatformInvitesApi = typeof platformInvitesApi;
