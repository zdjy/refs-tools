import type { AuthSessionResponse, PasswordLoginBody } from '@refs-tools/contracts/auth'
import { request } from './http'

export const authApi = {
  session: () => request<AuthSessionResponse['data']>('/auth/session'),
  login: (body: PasswordLoginBody) => request<AuthSessionResponse['data']>('/auth/login/password', body),
  logout: () => request<unknown>('/auth/logout', {}),
}
export type AuthApi = typeof authApi
