import { watch, type Ref } from 'vue';

export type FeedbackKind = 'success' | 'info' | 'error';

/** 同步捕获清空再赋值，重复成功文案仍逐次通知；不重播挂载前的结果。 */
export function observeFeedback(source: Readonly<Ref<string>>, notify: (text: string) => void) {
  return watch(source, (text) => { if (text) notify(text); }, { flush: 'sync' });
}
