import type { AdminUserList, AdminUserQuery } from '@refs-tools/contracts/admin-users';
import { AdminApiError, platformClient, type PlatformClient } from '../http/platform-client';

/** 负责人查询沿用平台用户读取权限，错误不泄漏传输层对象。 */
export class OrganizationOwnersApiError extends Error {
  constructor(readonly code: string) { super(code); }
}

/** 按昵称或邮箱分页查找已有账号，不读取业务档案或持久缓存。 */
export function createOrganizationOwnersApi(client: PlatformClient) {
  return {
    async list(query: AdminUserQuery): Promise<AdminUserList> {
      try { return await client.get(`/admin/users?${new URLSearchParams({ ...query, status: 'active' } as Record<string, string>)}`); }
      catch (error) {
        throw new OrganizationOwnersApiError(error instanceof AdminApiError
          ? error.code ?? (error.status === 0 ? 'NETWORK_ERROR' : 'SERVICE_UNAVAILABLE') : 'SERVICE_UNAVAILABLE');
      }
    },
  };
}
export const organizationOwnersApi = createOrganizationOwnersApi(platformClient);
