import type { AdminUser, AdminUserList, AdminUserQuery, CreateAdminUser, UpdateAdminUser } from '@refs-tools/contracts/admin-users';
import { adminRequest } from '../admin-http';

/** 平台用户 CRUD API，敏感数据不进入框架缓存。 */
export const adminUsersApi = {
  list(query: AdminUserQuery): Promise<AdminUserList> {
    return adminRequest(`/admin/users?${new URLSearchParams(query as Record<string, string>)}`);
  },
  detail(id: string): Promise<AdminUser> { return adminRequest(`/admin/users/${id}`); },
  create(input: CreateAdminUser): Promise<AdminUser> {
    return adminRequest('/admin/users', { method: 'POST', body: JSON.stringify(input) });
  },
  update(id: string, input: UpdateAdminUser): Promise<AdminUser> {
    return adminRequest(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
  },
  remove(id: string, version: number): Promise<{ deleted: true }> {
    return adminRequest(`/admin/users/${id}`, { method: 'DELETE', body: JSON.stringify({ version }) });
  },
};
