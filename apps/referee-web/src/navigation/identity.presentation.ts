export type IdentityStatus = 'unknown' | 'loading' | 'authenticated' | 'anonymous' | 'error'

/** 仅投影公开显示名称，不将邮箱或服务端错误详情带入导航。 */
export function identityPresentation(status: IdentityStatus, displayName?: string) {
  if (status === 'unknown' || status === 'loading') return { kind: 'pending' as const, text: '正在确认登录状态…' }
  if (status === 'error') return { kind: 'error' as const, text: '暂时无法确认登录状态' }
  if (status === 'authenticated') return { kind: 'account' as const, text: displayName || '我的账号' }
  return { kind: 'anonymous' as const, text: '登录' }
}
