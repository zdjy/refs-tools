import type { AuthSessionResponse } from '@refs-tools/contracts/auth';
import { adminRequest } from '../admin-http';

/** 恢复真实管理会话，同时由服务端核验平台权限。 */
export function getUserInfo() {
  return adminRequest<AuthSessionResponse['data']>('/admin/session');
}

/** 保留框架登录表单接口，凭据只经 HTTPS 发送，响应不含 token。 */
export async function login(params: { username: string; password: string }) {
  await adminRequest('/auth/login/password', {
    method: 'POST', body: JSON.stringify({ email: params.username.trim().toLowerCase(), password: params.password }),
  });
  try { return await getUserInfo(); }
  catch (error) { await logout(); throw error; }
}

/** 撤销服务端会话，不仅清理界面。 */
export function logout() { return adminRequest('/auth/logout', { method: 'POST' }); }
