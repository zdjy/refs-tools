import { onBeforeUnmount, onMounted, ref } from 'vue';

/** 与 `styles/index.less`、各组件里的媒体查询保持同一个断点条件。 */
const COMPACT_QUERY = '(pointer: coarse), (max-width: 767px)';

/**
 * 触屏 / 窄屏判定，供表格列宽等**必须由 JS 取值**的表现层参数使用。
 *
 * 只在需要按视口切换尺寸时使用（例如行内操作按钮从纯图标变为「图标 + 文字」）；
 * 纯样式差异仍用 CSS 媒体查询表达，不把布局搬进 JS。
 */
export function useCompactViewport() {
  const compact = ref(false);
  let query: MediaQueryList | null = null;

  function sync() {
    compact.value = query?.matches ?? false;
  }

  onMounted(() => {
    query = window.matchMedia(COMPACT_QUERY);
    sync();
    query.addEventListener('change', sync);
  });

  onBeforeUnmount(() => query?.removeEventListener('change', sync));

  return compact;
}
