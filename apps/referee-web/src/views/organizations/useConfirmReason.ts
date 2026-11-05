import { ref } from 'vue'

/** 理由长度上限，与服务端契约一致（MemberChange.reason）。 */
export const REASON_MAX = 500
const sensitive = /(?:https?:|[a-z][a-z0-9+.-]*:\/\/|password|token|secret|signature|验证码|密码|密钥)/i

/** 校验理由是否可提交；与服务端审计白名单规则一致，让用户在提交前就知道哪些内容不允许。 */
export function reasonProblem(reason: string): string {
  const value = reason.trim()
  if (!value) return '请填写操作理由'
  if (value.length > REASON_MAX) return `理由不超过 ${REASON_MAX} 个字符`
  if (sensitive.test(value)) return '理由中不能包含链接、密码或令牌等敏感内容'
  return ''
}

/**
 * 「理由 + 二次确认」对话状态。`visible` 控制显示；`target` 保存待确认的操作对象，
 * 关闭时保留 target 直到下次打开，否则离场动画期间标题与按钮文案会闪成空白。
 * 理由与错误在关闭时立即清空，避免私有输入留在内存里被下一个操作复用。
 *
 * 弹窗组件常驻挂载，Naive 的焦点陷阱在挂载时记录「之前的焦点」，此时多半是 main 而不是触发按钮，
 * 因此关闭后的焦点恢复由这里在打开时记录触发元素、关闭后自行完成（键盘用户不会丢失位置）。
 */
export function useConfirmReason<T>() {
  const target = ref<T | null>(null)
  const visible = ref(false)
  const reason = ref('')
  const problem = ref('')
  let trigger: HTMLElement | null = null

  function open(value: T) {
    // 单测运行在无 DOM 的 node 环境，此时没有可记录的触发元素。
    const active = typeof document === 'undefined' ? null : document.activeElement
    trigger = active && 'focus' in active ? (active as HTMLElement) : null
    target.value = value
    visible.value = true
    reason.value = ''
    problem.value = ''
  }
  function close() {
    visible.value = false
    reason.value = ''
    problem.value = ''
    // 触发元素可能因列表刷新已被移除（例如已批准的申请行），此时不移动焦点。
    if (trigger?.isConnected) trigger.focus({ preventScroll: true })
    trigger = null
  }
  /** 通过校验时返回规整后的理由，否则设置 problem 并返回 null。 */
  function take(): string | null {
    problem.value = reasonProblem(reason.value)
    return problem.value ? null : reason.value.trim()
  }
  return { target, visible, reason, problem, open, close, take }
}
