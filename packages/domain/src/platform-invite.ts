import type { PlatformInvite } from '@refs-tools/contracts/platform-invites'

/**
 * 平台创建邀请码状态。一次性码：已使用优先于撤销与过期（库内约束保证使用与撤销互斥）；
 * 到期时刻即失效，与成员码、邀请一致。状态按调用时刻投影，不依赖后台任务回写，
 * 因此列表读取与消费时的过期边界一致。
 */
export function platformInviteStatus(invite: { usedAt: Date | null; revokedAt: Date | null; expiresAt: Date }, now: Date): PlatformInvite['status'] {
  if (invite.usedAt) return 'used'
  if (invite.revokedAt) return 'revoked'
  return invite.expiresAt.getTime() <= now.getTime() ? 'expired' : 'active'
}
