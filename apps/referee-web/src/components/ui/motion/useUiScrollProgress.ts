import { onBeforeUnmount, onMounted, type Ref } from 'vue'
import { scroll } from 'motion'

/**
 * 将目标元素的阅读进度写入进度条的 --progress 变量，由静态工具类换算为 scaleX。
 * 直接改写变量而不经响应式状态，避免每个滚动帧都触发组件重渲染。
 */
export function useUiScrollProgress(bar: Ref<HTMLElement | null>, target: Ref<HTMLElement | null>) {
  let stop: VoidFunction | undefined
  onMounted(() => {
    if (!bar.value || !target.value) return
    const el = bar.value
    stop = scroll((progress) => el.style.setProperty('--progress', String(progress)), {
      target: target.value,
      offset: ['start start', 'end end'],
    })
  })
  onBeforeUnmount(() => stop?.())
}
