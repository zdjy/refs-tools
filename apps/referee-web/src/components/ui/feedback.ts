import { watch, type Ref } from 'vue'

export type FeedbackKind = 'success' | 'info' | 'error'

/** 同步观察结果状态，捕获同一轮更新中的清空再赋值，让重复操作仍有反馈；不重播挂载前的旧结果。 */
export function observeFeedback(source: Readonly<Ref<string>>, notify: (text: string) => void) {
  return watch(source, (text) => { if (text) notify(text) }, { flush: 'sync' })
}
