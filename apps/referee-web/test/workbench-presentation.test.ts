import { describe, expect, it } from 'vitest'
import { createClock, toggleClock } from '../src/domain/workbench'
import { presentClock } from '../src/views/workbench/workbench.presentation'
import { uiTokens, applyUiTokens } from '../src/ui-tokens'

describe('工作台表现层投影', () => {
  it('到时有明确文字提示，重置后恢复可开始状态', () => {
    const running = toggleClock(createClock('shot', 1000, '进攻计时'), 1000)
    expect(presentClock(running, 3000)).toMatchObject({ state: '已到时', value: '00:00.0', expired: true })
    expect(presentClock(toggleClock(running, 3000), 3000).cannotStart).toBe(true)
    expect(presentClock(createClock('shot', 1000, '进攻计时'), 3000)).toMatchObject({ state: '待开始', cannotStart: false })
  })

  it('CSS 变量使用同一 token 源，统一转换多词变量名', () => {
    const variables = new Map<string, string>()
    applyUiTokens({ style: { setProperty: (key, value) => { variables.set(key, value ?? '') } } })
    expect(variables.get('--canvas')).toBe(uiTokens.canvas)
    expect(variables.get('--accent-hover')).toBe(uiTokens.accentHover)
    expect(variables.size).toBe(Object.keys(uiTokens).length)
  })
})
