import type { Ref } from 'vue'
import { useMessage } from 'naive-ui'
import { observeFeedback, type FeedbackKind } from './feedback'

/** 在根 MessageProvider 内将状态结果适配为 toast；持久错误与重试仍由页面呈现。 */
export function useUiFeedback(source: Readonly<Ref<string>>, kind: FeedbackKind = 'success') {
  const message = useMessage()
  return observeFeedback(source, (text) => {
    message[kind](text, { duration: kind === 'error' ? 6000 : 4000, closable: true, keepAliveOnHover: true })
  })
}
