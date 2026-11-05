import type { JoinCode } from '@refs-tools/contracts/organization-access'

/**
 * 成员码状态。撤销优先于其他原因；到期时刻即失效（与邀请一致），次数用尽最后判定。
 * 状态按调用时刻投影，不依赖后台任务回写，因此过期边界在读取与消费时一致。
 */
export function joinCodeStatus(code: { revokedAt: Date | null; expiresAt: Date; uses: number; maxUses: number }, now: Date): JoinCode['status'] {
  if (code.revokedAt) return 'revoked'
  if (code.expiresAt.getTime() <= now.getTime()) return 'expired'
  return code.uses >= code.maxUses ? 'exhausted' : 'active'
}
