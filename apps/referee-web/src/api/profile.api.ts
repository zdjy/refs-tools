import type { ReadAuthorization } from '@refs-tools/contracts/media'
import type { Profile, UpdateProfileBody } from '@refs-tools/contracts/profile'
import { HttpError } from './http/errors'
import { createPlatformClient, type PlatformClient } from './http/platform-client'

/** 档案上下文只暴露可识别错误码，不携带服务端异常文本或签名 URL。 */
export class ProfileApiError extends Error {
  constructor(readonly code: string, readonly status: number) { super(code) }
}

function toProfileError(error: unknown): ProfileApiError {
  if (!(error instanceof HttpError)) return new ProfileApiError('SERVICE_UNAVAILABLE', 0)
  if (error.kind === 'offline') return new ProfileApiError('OFFLINE', 0)
  if (error.kind === 'network') return new ProfileApiError('NETWORK_ERROR', 0)
  return new ProfileApiError(error.code ?? 'SERVICE_UNAVAILABLE', error.status)
}

export function createProfileApi(client: PlatformClient) {
  const call = <T>(task: Promise<T>) => task.catch((error) => { throw toProfileError(error) })
  return {
    read: () => call(client.get<Profile>('/profile')),
    update: (body: UpdateProfileBody) => call(client.patch<Profile>('/profile', body)),
    avatarUrl: (mediaId: string) => call(client.get<ReadAuthorization>(`/media/${encodeURIComponent(mediaId)}/read-url`)),
  }
}

export const profileApi = createProfileApi(createPlatformClient({ baseURL: '/api/v1' }))
export type ProfileApi = typeof profileApi

/** 面向用户的中文反馈不依赖服务端异常文本。 */
export function profileErrorMessage(error: unknown): string {
  const messages: Record<string, string> = {
    OFFLINE: '当前处于离线状态，资料未提交。已填写的内容仍保留在页面上，恢复网络后再保存。',
    NETWORK_ERROR: '连接失败或超时，请检查网络后重试。已填写的内容仍保留在页面上；如多次失败，请先刷新确认资料是否已保存。',
    UNAUTHENTICATED: '登录已失效，请重新登录后再保存。',
    VERSION_CONFLICT: '档案已被其他设备或后台更新，请刷新页面后再提交。',
    INVALID_NICKNAME: '昵称需为 1-80 个字符。',
    INVALID_LEGAL_NAME: '真实姓名不超过 40 个字符。',
    INVALID_PHONE: '请填写含国家代码的手机号，例如 +8613800138000。',
    INVALID_REGION: '请选择完整的省/市/区。',
    INVALID_ADDRESS: '详细地址不超过 200 个字符。',
    INVALID_BIRTH_DATE: '请选择 1900-01-01 至今天的有效生日。',
    INVALID_AVATAR: '头像尚未上传成功，请重新上传后再保存。',
  }
  return error instanceof ProfileApiError && messages[error.code]
    ? messages[error.code]! : '服务暂时不可用，请稍后重试。已填写的内容仍保留在页面上。'
}

/** 读取失败时没有任何输入需要保留，文案只说明可重试，不暗示已保存或已填写。 */
export function profileLoadErrorMessage(error: unknown): string {
  const code = error instanceof ProfileApiError ? error.code : ''
  if (code === 'OFFLINE') return '当前处于离线状态，无法读取账号资料。恢复网络后请重新读取。'
  if (code === 'NETWORK_ERROR') return '连接较慢或已中断，已自动重试仍未成功，请检查网络后重新读取。'
  if (code === 'UNAUTHENTICATED') return '登录已失效，请重新登录后查看账号资料。'
  return '暂时无法读取账号资料，请稍后重试。若持续失败，请联系平台管理员。'
}
