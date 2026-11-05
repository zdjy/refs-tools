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
    expect(variables.get('--focus-border')).toBe(uiTokens.focusBorder)
    expect(variables.get('--font')).toBe(refereeTheme.common?.fontFamily)
    expect(variables.get('--shadow')).toBe(refereeTheme.Card?.boxShadow)
    expect(refereeTheme.Drawer?.color).toBe(uiTokens.canvas)
    expect(refereeTheme.Drawer?.boxShadow).toBe(uiTokens.raised)
  })

  it('阴影为暖调低不透明度微阴影，聚焦环为球场红 30%', () => {
    for (const shadow of [uiTokens.shadow, uiTokens.raised, uiTokens.lift, uiTokens.selected]) {
      expect(shadow).toMatch(/rgba\(27, 22, 16, 0\.0\d\)$/)
    }
    expect(uiTokens.focus).toBe('0 0 0 2px rgba(216, 58, 30, 0.3)')
  })

  it('圆角遵循 macOS 毛玻璃规范：卡片与弹窗 12px、按钮胶囊，不出现 24px', () => {
    expect(refereeTheme.Card?.borderRadius).toBe('12px')
    expect(refereeTheme.Button?.borderRadiusMedium).toBe('999px')
    expect(refereeTheme.Input?.borderRadius).toBe('12px')
    expect(refereeTheme.Input?.borderFocus).toBe(`1px solid ${uiTokens.focusBorder}`)
  })

  it('按钮尺寸适配集中维护且不重定义颜色', () => {
    expect(refereeControlThemes.iconButton).toEqual({ fontSizeMedium: '22px' })
    expect(refereeControlThemes.sessionButton).toEqual({ heightMedium: 'auto', paddingMedium: '10px 18px', borderRadiusMedium: '12px' })
    expect(refereeControlThemes.wrappingButton).toEqual({ heightMedium: 'auto' })
    expect(refereeModalStyle).toEqual({ width: 'calc(100vw - 32px)' })
    expect(refereeTheme.Button?.heightMedium).toBe('44px')
  })
})

describe('加载反馈主题', () => {
  it('路由进度条使用球场红实色，错误态使用 hover 红，均来自共享 token', () => {
    expect(refereeTheme.LoadingBar?.colorLoading).toBe(uiTokens.red)
    expect(refereeTheme.LoadingBar?.colorError).toBe(uiTokens.redHover)
  })
})
