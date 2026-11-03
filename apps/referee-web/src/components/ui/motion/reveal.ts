import { animate, inView, scroll } from 'motion'
import type { ObjectDirective } from 'vue'

export interface RevealOptions {
  /** 入场延迟，单位秒；同组元素用递增值形成错落。 */
  delay?: number
  /** 起始纵向偏移，单位 px。 */
  y?: number
}

/** 系统要求减弱动态效果时，所有入场与滚动联动一律跳过，内容保持默认可见。 */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const cleanups = new WeakMap<HTMLElement, VoidFunction>()

function remember(el: HTMLElement, stop: VoidFunction) {
  cleanups.get(el)?.()
  cleanups.set(el, stop)
}

/**
 * 元素首次进入视口时淡入并上移。
 * 初始可见，仅在脚本接管后才隐藏，避免脚本失败时内容永久不可见。
 */
export const vReveal: ObjectDirective<HTMLElement, RevealOptions | undefined> = {
  mounted(el, { value }) {
    if (prefersReducedMotion()) return
    const { delay = 0, y = 28 } = value ?? {}
    el.style.opacity = '0'
    const stop = inView(el, () => {
      const run = animate(el, { opacity: [0, 1], y: [y, 0] }, { duration: 0.9, delay, ease: [0.25, 0.1, 0.25, 1] })
      // 动画结束后清除内联样式，让 hover 抬升与按压反馈的工具类重新生效。
      run.then(() => {
        el.style.removeProperty('opacity')
        el.style.removeProperty('transform')
      })
    }, { amount: 0.12, margin: '0px 0px -6% 0px' })
    remember(el, stop)
  },
  unmounted(el) {
    cleanups.get(el)?.()
    cleanups.delete(el)
  },
}

/**
 * 装饰性元素随滚动轻微位移，仅用于不可交互的插图；位移幅度单位 px。
 * 不改变滚动行为，也不影响文字内容的位置。
 */
export const vDrift: ObjectDirective<HTMLElement, number | undefined> = {
  mounted(el, { value }) {
    if (prefersReducedMotion()) return
    const range = value ?? 28
    const stop = scroll(animate(el, { y: [range, -range] }, { ease: 'linear' }), {
      target: el,
      offset: ['start end', 'end start'],
    })
    remember(el, stop)
  },
  unmounted(el) {
    cleanups.get(el)?.()
    cleanups.delete(el)
  },
}
