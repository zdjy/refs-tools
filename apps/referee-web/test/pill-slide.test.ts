import { describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'

// node 环境没有 DOM：这里只验证选中胶囊"先显示旧位置、两帧后切到目标位置"的时序，
// 真实的滑动效果依赖浏览器过渡，需在浏览器中目测。
const mounted: Array<() => unknown> = []
vi.mock('vue', async (original) => ({
  ...(await original<typeof import('vue')>()),
  onMounted: (hook: () => unknown) => { mounted.push(hook) },
}))
const frames: Array<() => void> = []
vi.stubGlobal('requestAnimationFrame', (callback: () => void) => { frames.push(callback); return frames.length })

describe('usePillSlide', () => {
  it('首次挂载直接就位，再次挂载先显示上一次位置并在两帧后滑向目标', async () => {
    const { usePillSlide } = await import('../src/components/navigation/usePillSlide')

    const first = effectScope().run(() => usePillSlide(ref(1)))!
    expect(first.value).toBe(1)
    await mounted.shift()?.()

    const second = effectScope().run(() => usePillSlide(ref(3)))!
    expect(second.value).toBe(1)
    const run = mounted.shift()!()
    await nextTick()
    await run
    expect(second.value).toBe(1)
    frames.shift()?.()
    frames.shift()?.()
    expect(second.value).toBe(3)
  })
})
