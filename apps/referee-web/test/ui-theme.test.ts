import { describe, expect, it } from 'vitest'
import { applyUiTokens, uiTokens } from '../src/ui-tokens'
import { refereeControlThemes, refereeModalStyle, refereeTheme } from '../src/ui-theme'

describe('共享 UI 主题适配', () => {
  it('CSS 变量与组件库使用同一 token 来源', () => {
    const variables = new Map<string, string>()
    applyUiTokens({ style: { setProperty: (name, value) => { variables.set(name, String(value)) } } })
    expect(variables.size).toBe(Object.keys(uiTokens).length)
    expect(variables.get('--canvas')).toBe(refereeTheme.common?.bodyColor)
    expect(variables.get('--red-hover')).toBe(uiTokens.redHover)
    expect(variables.get('--font')).toBe(refereeTheme.common?.fontFamily)
    expect(variables.get('--shadow')).toBe(refereeTheme.Card?.boxShadow)
  })

  it('按钮尺寸适配集中维护且不重定义颜色', () => {
    expect(refereeControlThemes.iconButton).toEqual({ fontSizeMedium: '22px' })
    expect(refereeControlThemes.sessionButton).toEqual({ heightMedium: 'auto', paddingMedium: '10px 18px' })
    expect(refereeControlThemes.wrappingButton).toEqual({ heightMedium: 'auto' })
    expect(refereeModalStyle).toEqual({ width: 'calc(100vw - 32px)' })
    expect(refereeTheme.Button?.heightMedium).toBe('44px')
    expect(refereeTheme.Button?.borderRadiusMedium).toBe('999px')
  })
})
