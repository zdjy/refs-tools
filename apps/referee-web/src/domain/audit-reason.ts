/** 审计理由长度上限，与成员、认证等写操作契约的 reason 字段一致。 */
export const REASON_MAX = 500
const sensitive = /(?:https?:|[a-z][a-z0-9+.-]*:\/\/|password|token|secret|signature|验证码|密码|密钥)/i

/**
 * 提交前校验审计理由，与服务端审计白名单保持同一语义：
 * 为空、超长或包含链接与凭据时直接说明，不让用户等到写入后才看到拒绝。
 */
export function reasonProblem(reason: string): string {
  const value = reason.trim()
  if (!value) return '请填写操作理由'
  if (value.length > REASON_MAX) return `理由不超过 ${REASON_MAX} 个字符`
  if (sensitive.test(value)) return '理由中不能包含链接、密码或令牌等敏感内容'
  return ''
}
