import type { CreateOrganization, OrganizationDecision, OrganizationDetail, OrganizationList, OrganizationQuery, UpdateOrganization } from '@refs-tools/contracts/organizations';
import type { PlatformOwnershipTransfer } from '@refs-tools/contracts/organization-ownership';
import { AdminApiError, platformClient, type PlatformClient } from '../http/platform-client';

/** 组织网关只暴露上下文错误，不向页面传播传输层异常。 */
export class OrganizationsApiError extends Error {
  constructor(readonly code: string, readonly status: number) { super(code); }
}

/** 组织治理路径与错误翻译集中在网关，真实响应不进入模板缓存。 */
export function createOrganizationsApi(client: PlatformClient) {
  async function call<T>(task: Promise<T>): Promise<T> {
    try { return await task; }
    catch (error) {
      if (error instanceof AdminApiError) throw new OrganizationsApiError(error.code ?? (error.status === 0 ? 'NETWORK_ERROR' : 'SERVICE_UNAVAILABLE'), error.status);
      throw new OrganizationsApiError('SERVICE_UNAVAILABLE', 0);
    }
  }
  return {
    list: (query: OrganizationQuery) => call(client.get<OrganizationList>(`/admin/organizations?${new URLSearchParams(query as Record<string, string>)}`)),
    detail: (id: string) => call(client.get<OrganizationDetail>(`/admin/organizations/${encodeURIComponent(id)}`)),
    create: (input: CreateOrganization) => call(client.post<OrganizationDetail>('/admin/organizations', input)),
    update: (id: string, input: UpdateOrganization) => call(client.patch<OrganizationDetail>(`/admin/organizations/${encodeURIComponent(id)}`, input)),
    decide: (id: string, input: OrganizationDecision) => call(client.post<OrganizationDetail>(`/admin/organizations/${encodeURIComponent(id)}/decision`, input)),
    transferOwner: (id: string, input: PlatformOwnershipTransfer) => call(client.post<OrganizationDetail>(`/admin/organizations/${encodeURIComponent(id)}/ownership`, input)),
  };
}
export const organizationsApi = createOrganizationsApi(platformClient);
export type OrganizationsApi = typeof organizationsApi;
