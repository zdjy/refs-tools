import { describe, expect, it } from 'vitest'
import { applyUiTokens, uiTokens } from '../src/ui-tokens'
import { refereeControlThemes, refereeModalStyle, refereeTheme } from '../src/ui-theme'

describe('共享 UI 主题适配', () => {
  it('CSS 变量与组件库使用同一 token 来源', () => {
    const variables = new Map<string, string>()
    applyUiTokens({ style: { setProperty: (name, value) => { variables.set(name, String(value)) } } })
    expect(variables.size).toBe(Object.keys(uiTokens).length)
    expect(variables.get('--canvas')).toBe(refereeTheme.common?.bodyColor)
    expect(variables.get('--accent-hover')).toBe(uiTokens.accentHover)
    expect(variables.get('--focus-border')).toBe(uiTokens.focusBorder)
    expect(variables.get('--font')).toBe(refereeTheme.common?.fontFamily)
    expect(variables.get('--shadow')).toBe(refereeTheme.Card?.boxShadow)
    expect(refereeTheme.Drawer?.color).toBe(uiTokens.canvas)
    expect(refereeTheme.Drawer?.boxShadow).toBe(uiTokens.raised)
  })

  it('色板值与 docs/ui/macos_fiba.md 一致，错误态复用球场红而不另立色相', () => {
    expect({
      canvas: uiTokens.canvas, soft: uiTokens.soft, sand: uiTokens.sand, facet: uiTokens.facet, surface: uiTokens.surface,
      ink: uiTokens.ink, body: uiTokens.body, muted: uiTokens.muted, line: uiTokens.line,
      accent: uiTokens.accent, accentHover: uiTokens.accentHover, gold: uiTokens.gold, green: uiTokens.green,
    }).toEqual({
      canvas: '#FAF8F5', soft: '#F5F2EB', sand: '#EBE4D8', facet: '#DDD4C5', surface: '#FFFFFF',
      ink: '#111111', body: '#635E57', muted: '#8C867E', line: '#E2DDD5',
      accent: '#D83A1E', accentHover: '#BA2F17', gold: '#D4A017', green: '#1B8754',
    })
    expect(uiTokens.danger).toBe(uiTokens.accentHover)
  })

  it('分组容器用发丝环加柔和阴影，阴影用暖褐基色，聚焦环为球场红 30%', () => {
    expect(uiTokens.shadow).toMatch(/^0 0 0 1px rgba\(27, 22, 16, 0\.03\)/)
    for (const shadow of [uiTokens.shadow, uiTokens.raised, uiTokens.lift, uiTokens.selected, uiTokens.tile]) {
      expect(shadow).toMatch(/rgba\((27, 22, 16|255, 255, 255), 0\.\d+\)$/)
    }
    expect(uiTokens.focus).toBe('0 0 0 2px rgba(216, 58, 30, 0.3)')
  })

  it('有色 token 的色相都不在蓝紫区间（200–330°），缓动曲线合法', () => {
    const hueOf = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      const max = Math.max(r, g, b)
      const d = max - Math.min(r, g, b)
      const sector = d === 0 ? 0 : max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
      return Math.round((sector * 60 + 360) % 360)
    }
    const colourful = ['accent', 'accentHover', 'danger', 'gold', 'green'] as const
    for (const key of colourful) {
      const hue = hueOf(uiTokens[key])
      expect(hue < 200 || hue > 330, `${key} 色相 ${hue}° 落在蓝紫区间`).toBe(true)
    }
    expect(uiTokens.easeIos).toMatch(/^cubic-bezier\(/)
    expect(uiTokens.easeSpring).toMatch(/^cubic-bezier\(/)
  })

  it('圆角：面板与输入框 12px、按钮胶囊，不出现 24px', () => {
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
  it('路由进度条使用强调色实色，错误态使用 hover 色，均来自共享 token', () => {
    expect(refereeTheme.LoadingBar?.colorLoading).toBe(uiTokens.accent)
    expect(refereeTheme.LoadingBar?.colorError).toBe(uiTokens.danger)
  })
})
