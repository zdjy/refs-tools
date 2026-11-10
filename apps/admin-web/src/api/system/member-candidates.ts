import type { CandidateList } from '@refs-tools/contracts/organization-access';
import { AdminApiError, platformClient, type PlatformClient } from '../http/platform-client';

/** 候选人检索错误只保留稳定错误码，不携带响应体、关键词或账号标识。 */
export class MemberCandidatesApiError extends Error {
  constructor(readonly code: string, readonly status: number) {
    super(code);
  }
}

/** 按昵称、实名或完整邮箱检索可邀请账号；响应只含昵称、ID 尾号与关系，不缓存。 */
export function createMemberCandidatesApi(client: PlatformClient) {
  return {
    async list(organizationId: string, keyword: string, page = '1'): Promise<CandidateList> {
      const query = new URLSearchParams({ keyword, page });
      try {
        return await client.get<CandidateList>(
          `/organizations/${encodeURIComponent(organizationId)}/member-candidates?${query}`
        );
      } catch (error) {
        if (!(error instanceof AdminApiError)) throw new MemberCandidatesApiError('SERVICE_UNAVAILABLE', 0);
        throw new MemberCandidatesApiError(
          error.code ?? (error.status === 0 ? 'NETWORK_ERROR' : 'SERVICE_UNAVAILABLE'),
          error.status
        );
      }
    },
  };
}
export const memberCandidatesApi = createMemberCandidatesApi(platformClient);
export type MemberCandidatesApi = typeof memberCandidatesApi;
