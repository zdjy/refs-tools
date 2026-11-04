import type { Ref } from 'vue';
import { useMessage } from 'naive-ui';
import { observeFeedback, type FeedbackKind } from './feedback';

/** 只在表现层适配根 Provider 的通知，不让业务状态依赖组件库。 */
export function useUiFeedback(source: Readonly<Ref<string>>, kind: FeedbackKind = 'success') {
  const message = useMessage();
  return observeFeedback(source, (text) => {
    message[kind](text, { duration: kind === 'error' ? 6000 : 4000, closable: true, keepAliveOnHover: true });
  });
}
