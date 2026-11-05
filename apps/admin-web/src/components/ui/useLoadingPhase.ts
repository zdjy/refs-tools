import { onScopeDispose, readonly, ref, watch, type Ref } from 'vue';
import { createLoadingPhaseTracker, type LoadingPhase } from '../../infrastructure/network/loading-phase';

/**
 * 把页面 Composable 暴露的布尔 loading 转为分阶段的加载反馈：
 * 短请求不闪烁，较慢时提示，长时间无响应时由页面给出重试入口。
 */
export function useLoadingPhase(loading: Readonly<Ref<boolean>>) {
  const phase = ref<LoadingPhase>('idle');
  const tracker = createLoadingPhaseTracker((next) => { phase.value = next; });
  const stop = watch(loading, (value) => { if (value) tracker.start(); else tracker.finish(); }, { immediate: true, flush: 'sync' });
  onScopeDispose(() => { stop(); tracker.dispose(); });
  return readonly(phase);
}
