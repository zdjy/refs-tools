import type { GlobalThemeOverrides } from 'naive-ui'
import { uiTokens as t } from './ui-tokens'

// 通过公开主题接口同时适配两类输入控件，避免依赖 .n-* 内部结构；升级按 ADR 0007 回归。
const inputTheme = {
  borderRadius: '12px', heightMedium: '46px', color: t.soft, colorFocus: t.soft,
  border: '1px solid transparent', borderFocus: `1px solid ${t.focusBorder}`,
  boxShadowFocus: t.focus, textColor: t.ink,
}

// Modal preset 的 Card 根样式未分层且固定 width:100%；通过公开 style 属性保留移动端两侧留白。
export const refereeModalStyle = { width: 'calc(100vw - 32px)' }

// 根节点未分层样式优先于工具类，尺寸差异通过公开主题接口适配，见 ADR 0013。
export const refereeControlThemes = {
  iconButton: { fontSizeMedium: '22px' },
  // 会话列表项属于侧栏导航项，圆角取 rounded-xl（12px）而非胶囊。
  sessionButton: { heightMedium: 'auto', paddingMedium: '10px 18px', borderRadiusMedium: '12px' },
  wrappingButton: { heightMedium: 'auto' },
} satisfies Record<string, NonNullable<GlobalThemeOverrides['Button']>>

// 覆盖 Naive UI 默认品牌色和尺寸，统一映射共享 token，不在页面逐个修补（ADR 0007）。
export const refereeTheme: GlobalThemeOverrides = {
  common: {
    primaryColor: t.ink, primaryColorHover: t.black, primaryColorPressed: t.black, primaryColorSuppl: t.ink,
    infoColor: t.body, infoColorHover: t.ink, infoColorPressed: t.ink, infoColorSuppl: t.body,
    successColor: t.green, warningColor: t.red, errorColor: t.red,
    bodyColor: t.canvas, cardColor: t.surface, modalColor: t.surface, popoverColor: t.surface,
    textColorBase: t.ink, textColor1: t.ink, textColor2: t.body, textColor3: t.body,
    borderColor: t.line, dividerColor: t.line, borderRadius: '12px', borderRadiusSmall: '12px',
    fontFamily: t.font, cubicBezierEaseInOut: 'cubic-bezier(0, 0, 0.58, 1)', cubicBezierEaseOut: 'cubic-bezier(0, 0, 0.58, 1)',
  },
  Button: {
    borderRadiusTiny: '999px', borderRadiusSmall: '999px', borderRadiusMedium: '999px', borderRadiusLarge: '999px',
    heightTiny: '44px', heightSmall: '44px', heightMedium: '44px', heightLarge: '48px',
    fontWeight: '500', paddingMedium: '0 18px', paddingLarge: '0 20px',
    colorSecondary: t.soft, colorSecondaryHover: t.line, colorSecondaryPressed: t.sand,
    textColor: t.ink, textColorHover: t.red, textColorPressed: t.redHover, textColorTertiary: t.body,
  },
  Card: {
    borderRadius: '12px', paddingMedium: '20px', paddingLarge: '24px',
    borderColor: t.line, boxShadow: t.shadow,
  },
  Alert: {
    borderRadius: '12px', padding: '12px 16px',
    colorInfo: t.soft, borderInfo: `1px solid ${t.line}`, contentTextColorInfo: t.body,
    colorError: t.soft, borderError: `1px solid ${t.red}`, contentTextColorError: t.redHover,
  },
  Drawer: { color: t.canvas, boxShadow: t.raised },
  // 路由进度条使用球场红实色，错误态沿用同一色，不用渐变（共享 UI 基线）。
  LoadingBar: { colorLoading: t.red, colorError: t.redHover, height: '3px' },
  Input: inputTheme,
  InputNumber: inputTheme,
}
