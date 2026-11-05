import type {
  CandidateList, CreateJoinCode, GrantRole, JoinCode, JoinCodeList, OrganizationRole, OrganizationRoleList,
} from '@refs-tools/contracts/organization-access'
import type {
  InvitationList, MemberChange, MemberPageQuery, Membership, MembershipDecision, MembershipList, OrganizationInvitation,
} from '@refs-tools/contracts/organization-members'
import type { DirectoryList, DirectoryQuery, MyOrganization, MyOrganizationList, OrganizationApplication } from '@refs-tools/contracts/organization-self'
import type { PageQuery } from '@refs-tools/contracts/pagination'
import { HttpError } from './http/errors'
import { createPlatformClient, type PlatformClient } from './http/platform-client'

/** 组织上下文只暴露可识别错误码，不携带服务端异常文本、成员码或响应体。 */
export class OrganizationsApiError extends Error {
  constructor(readonly code: string, readonly status: number) { super(code) }
}

function toOrganizationsError(error: unknown): OrganizationsApiError {
  if (!(error instanceof HttpError)) return new OrganizationsApiError('SERVICE_UNAVAILABLE', 0)
  if (error.kind === 'offline') return new OrganizationsApiError('OFFLINE', 0)
  if (error.kind === 'network') return new OrganizationsApiError('NETWORK_ERROR', 0)
  return new OrganizationsApiError(error.code ?? 'SERVICE_UNAVAILABLE', error.status)
}

const id = encodeURIComponent
/** 只追加有值的分页参数，值经 URLSearchParams 编码，不拼接用户输入。 */
function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== '') search.set(key, String(value))
  const text = search.toString()
  return text ? `?${text}` : ''
}
const page = (value: PageQuery) => query({ page: value.page, pageSize: value.pageSize })

export function createOrganizationsApi(client: PlatformClient) {
  const call = <T>(task: Promise<T>) => task.catch((error) => { throw toOrganizationsError(error) })
  return {
    mine: (value: PageQuery = {}) => call(client.get<MyOrganizationList>(`/me/organizations${page(value)}`)),
    directory: (value: DirectoryQuery) => call(client.get<DirectoryList>(`/organization-directory${query({ ...value })}`)),
    apply: (body: OrganizationApplication) => call(client.post<MyOrganization>('/me/organization-applications', body)),
    inbox: (value: MemberPageQuery = {}) => call(client.get<InvitationList>(`/me/organization-invitations${page(value)}`)),
    acceptInvitation: (orgId: string, recordId: string) =>
      call(client.post<Membership>(`/organizations/${id(orgId)}/invitations/${id(recordId)}/accept`, {})),
    declineInvitation: (orgId: string, recordId: string) =>
      call(client.post<OrganizationInvitation>(`/organizations/${id(orgId)}/invitations/${id(recordId)}/decline`, {})),
    requestMembership: (orgId: string) => call(client.post<Membership>(`/organizations/${id(orgId)}/membership-requests`, {})),
    redeemCode: (token: string) => call(client.post<Membership>('/organization-join-codes/redeem', { token })),
    leave: (orgId: string, recordId: string, body: MemberChange) =>
      call(client.post<Membership>(`/organizations/${id(orgId)}/memberships/${id(recordId)}/leave`, body)),
    members: (orgId: string, value: MemberPageQuery = {}) => call(client.get<MembershipList>(`/organizations/${id(orgId)}/memberships${page(value)}`)),
    decideMember: (orgId: string, recordId: string, body: MembershipDecision) =>
      call(client.post<Membership>(`/organizations/${id(orgId)}/memberships/${id(recordId)}/decision`, body)),
    invitations: (orgId: string, value: MemberPageQuery = {}) => call(client.get<InvitationList>(`/organizations/${id(orgId)}/invitations${page(value)}`)),
    invite: (orgId: string, userId: string, validDays: number) =>
      call(client.post<OrganizationInvitation>(`/organizations/${id(orgId)}/invitations`, { userId, validDays })),
    revokeInvitation: (orgId: string, recordId: string, body: MemberChange) =>
      call(client.post<OrganizationInvitation>(`/organizations/${id(orgId)}/invitations/${id(recordId)}/revoke`, body)),
    candidates: (orgId: string, keyword: string, value: Pick<PageQuery, 'page'> = {}) =>
      call(client.get<CandidateList>(`/organizations/${id(orgId)}/member-candidates${query({ keyword, page: value.page })}`)),
    joinCodes: (orgId: string, value: PageQuery = {}) =>
      call(client.get<JoinCodeList>(`/organizations/${id(orgId)}/join-codes${page(value)}`)),
    createJoinCode: (orgId: string, body: CreateJoinCode) =>
      call(client.post<{ code: JoinCode; token: string }>(`/organizations/${id(orgId)}/join-codes`, body)),
    revokeJoinCode: (orgId: string, codeId: string, expectedVersion: number) =>
      call(client.post<JoinCode>(`/organizations/${id(orgId)}/join-codes/${id(codeId)}/revoke`, { expectedVersion })),
    roles: (orgId: string, value: PageQuery = {}) =>
      call(client.get<OrganizationRoleList>(`/organizations/${id(orgId)}/roles${page(value)}`)),
    grantRole: (orgId: string, body: GrantRole) => call(client.post<OrganizationRole>(`/organizations/${id(orgId)}/roles`, body)),
    revokeRole: (orgId: string, bindingId: string) =>
      call(client.post<{ revoked: true }>(`/organizations/${id(orgId)}/roles/${id(bindingId)}/revoke`, {})),
  }
}

export const organizationsApi = createOrganizationsApi(createPlatformClient({ baseURL: '/api/v1' }))
export type OrganizationsApi = typeof organizationsApi
