import { nextTick, onMounted, ref, watch, type Ref } from 'vue'

/**
 * 各页面独立挂载导航外壳，路由切换会销毁并重建选中胶囊，浏览器因此没有"位置变化"可做过渡。
 * 这里把上一次的位置保存在模块级变量里：新外壳先以旧位置渲染，下一帧再切到目标位置，过渡即可播放。
 * 变量只记录一个栏目序号，不含任何用户数据；首次进入时没有旧位置，直接就位，不播放动画。
 */
let lastIndex: number | null = null

export function usePillSlide(target: Ref<number>) {
  const shown = ref(lastIndex ?? target.value)

  onMounted(async () => {
    if (shown.value !== target.value) {
      // 等浏览器先按旧位置绘制一帧，再改成目标位置，否则两次赋值会被合并而不触发过渡。
      await nextTick()
      requestAnimationFrame(() => requestAnimationFrame(() => { shown.value = target.value }))
    }
    lastIndex = target.value
  })
  watch(target, (value) => { shown.value = value; lastIndex = value })

  return shown
}
