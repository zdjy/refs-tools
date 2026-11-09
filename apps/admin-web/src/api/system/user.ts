import type { AuthSessionResponse } from '@refs-tools/contracts/auth';
import { platformClient } from '../http/platform-client';
import { authApi } from '../auth.api';

/** 恢复真实管理会话，同时由服务端核验平台权限。 */
export function getUserInfo() {
  return platformClient.get<AuthSessionResponse['data']>('/admin/session');
}

/** 保留框架登录表单接口，凭据只经 HTTPS 发送，响应不含 token。 */
export async function login(params: { username: string; password: string }) {
  return authApi.loginWithPassword({ email: params.username, password: params.password });
}

/** 撤销服务端会话，不仅清理界面。 */
export function logout() { return platformClient.post('/auth/logout'); }
