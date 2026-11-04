import type { CreateInvitation, InvitationList, MemberChange, MemberPageQuery, Membership, MembershipDecision, MembershipList, OrganizationInvitation } from '@refs-tools/contracts/organization-members';
import { AdminApiError, platformClient, type PlatformClient } from '../http/platform-client';

/** 组织成员上下文错误；页面不依赖传输层或服务端异常文本。 */
export class OrganizationMembersApiError extends Error {
  constructor(readonly code: string, readonly status: number) { super(code); }
}

/** 邀请与成员使用相同 Cookie 客户端，私有记录不缓存。 */
export function createOrganizationMembersApi(client: PlatformClient) {
  async function call<T>(task: Promise<T>): Promise<T> {
    try { return await task; }
    catch (e) {
      if (e instanceof AdminApiError) throw new OrganizationMembersApiError(e.code ?? (e.status === 0 ? 'NETWORK_ERROR' : 'SERVICE_UNAVAILABLE'), e.status);
      throw new OrganizationMembersApiError('SERVICE_UNAVAILABLE', 0);
    }
  }
  const base = (id: string) => `/organizations/${encodeURIComponent(id)}`;
  const query = (value: MemberPageQuery) => new URLSearchParams(value as Record<string, string>);
  return {
    members: (id: string, q: MemberPageQuery) => call(client.get<MembershipList>(`${base(id)}/memberships?${query(q)}`)),
    invitations: (id: string, q: MemberPageQuery) => call(client.get<InvitationList>(`${base(id)}/invitations?${query(q)}`)),
    invite: (id: string, input: CreateInvitation) => call(client.post<OrganizationInvitation>(`${base(id)}/invitations`, input)),
    revoke: (id: string, recordId: string, input: MemberChange) => call(client.post<OrganizationInvitation>(`${base(id)}/invitations/${encodeURIComponent(recordId)}/revoke`, input)),
    decide: (id: string, recordId: string, input: MembershipDecision) => call(client.post<Membership>(`${base(id)}/memberships/${encodeURIComponent(recordId)}/decision`, input)),
  };
}
export const organizationMembersApi = createOrganizationMembersApi(platformClient);
