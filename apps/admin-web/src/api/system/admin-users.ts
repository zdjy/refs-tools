import type { AdminUser, AdminUserList, AdminUserQuery, CreateAdminUser, UpdateAdminUser } from '@refs-tools/contracts/admin-users';
import { platformClient } from '../http/platform-client';

/** 平台用户 CRUD API，敏感数据不进入框架缓存。 */
export const adminUsersApi = {
  list(query: AdminUserQuery): Promise<AdminUserList> {
    return platformClient.get(`/admin/users?${new URLSearchParams(query as Record<string, string>)}`);
  },
  detail(id: string): Promise<AdminUser> { return platformClient.get(`/admin/users/${encodeURIComponent(id)}`); },
  create(input: CreateAdminUser): Promise<AdminUser> { return platformClient.post('/admin/users', input); },
  update(id: string, input: UpdateAdminUser): Promise<AdminUser> {
    return platformClient.patch(`/admin/users/${encodeURIComponent(id)}`, input);
  },
  remove(id: string, version: number): Promise<{ deleted: true }> {
    return platformClient.delete(`/admin/users/${encodeURIComponent(id)}`, { version });
  },
};
