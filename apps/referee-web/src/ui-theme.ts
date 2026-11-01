import type { GlobalThemeOverrides } from 'naive-ui'
import { uiTokens as t } from './ui-tokens'

const inputTheme = {
  borderRadius: '12px', heightMedium: '46px', color: t.soft, colorFocus: t.soft,
  border: '1px solid transparent', borderFocus: `1px solid ${t.red}`,
  boxShadowFocus: t.focus, textColor: t.ink,
}

export const refereeTheme: GlobalThemeOverrides = {
  common: {
    primaryColor: t.ink, primaryColorHover: t.black, primaryColorPressed: t.black, primaryColorSuppl: t.ink,
    infoColor: t.body, infoColorHover: t.ink, infoColorPressed: t.ink, infoColorSuppl: t.body,
    successColor: t.green, warningColor: t.red, errorColor: t.red,
    bodyColor: t.canvas, cardColor: t.surface, modalColor: t.surface, popoverColor: t.surface,
    textColorBase: t.ink, textColor1: t.ink, textColor2: t.body, textColor3: t.body,
    borderColor: t.line, dividerColor: t.line, borderRadius: '12px', borderRadiusSmall: '12px',
    fontFamily: t.font, cubicBezierEaseInOut: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  },
  Button: {
    borderRadiusTiny: '999px', borderRadiusSmall: '999px', borderRadiusMedium: '999px', borderRadiusLarge: '999px',
    heightTiny: '44px', heightSmall: '44px', heightMedium: '44px', heightLarge: '48px',
    fontWeight: '600', paddingMedium: '0 18px', paddingLarge: '0 20px',
    colorSecondary: t.soft, colorSecondaryHover: t.line, colorSecondaryPressed: t.sand,
    textColor: t.ink, textColorHover: t.red, textColorPressed: t.redHover, textColorTertiary: t.body,
  },
  Card: {
    borderRadius: '16px', paddingMedium: '20px', paddingLarge: '24px',
    borderColor: t.line, boxShadow: t.shadow,
  },
  Alert: {
    borderRadius: '12px', padding: '12px 16px',
    colorInfo: t.soft, borderInfo: `1px solid ${t.line}`, contentTextColorInfo: t.body,
    colorError: t.soft, borderError: `1px solid ${t.red}`, contentTextColorError: t.redHover,
  },
  Modal: { borderRadius: '24px' },
  Input: inputTheme,
  InputNumber: inputTheme,
}
