import type { GlobalThemeOverrides } from 'naive-ui'
import { uiTokens as t } from './ui-tokens'

export const adminTheme: GlobalThemeOverrides = {
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
    fontWeight: '600', paddingMedium: '0 18px', colorSecondary: t.soft,
    colorSecondaryHover: t.line, colorSecondaryPressed: t.sand,
    textColor: t.ink, textColorHover: t.red, textColorPressed: t.redHover,
  },
  Card: { borderRadius: '16px', borderColor: t.line, boxShadow: t.shadow },
  Input: {
    borderRadius: '12px', heightMedium: '46px', color: t.soft, colorFocus: t.soft,
    border: '1px solid transparent', borderFocus: `1px solid ${t.red}`, boxShadowFocus: t.focus, textColor: t.ink,
  },
  Alert: {
    borderRadius: '12px', padding: '12px 16px', colorInfo: t.soft,
    borderInfo: `1px solid ${t.line}`, contentTextColorInfo: t.body,
    colorError: t.soft, borderError: `1px solid ${t.red}`, contentTextColorError: t.redHover,
  },
  // 模板布局使用组件库的公开主题接口，不用工具类与未分层的组件样式竞争。
  Layout: {
    color: t.canvas, textColor: t.ink, siderColor: t.sand, headerColor: t.surface,
    siderBorderColor: t.line, headerBorderColor: t.line,
  },
  Menu: {
    color: t.sand, borderRadius: '12px', itemHeight: '48px', fontSize: '14px',
    groupTextColor: t.body, itemTextColor: t.ink, itemTextColorHover: t.ink,
    itemTextColorActive: t.redHover, itemTextColorActiveHover: t.redHover,
    itemIconColor: t.body, itemIconColorHover: t.ink, itemIconColorCollapsed: t.ink,
    itemIconColorActive: t.redHover, itemIconColorActiveHover: t.redHover,
    itemColorHover: t.facet, itemColorActive: t.surface, itemColorActiveHover: t.surface,
    itemColorActiveCollapsed: t.surface,
  },
  Drawer: { color: t.sand, textColor: t.ink, boxShadow: t.shadow },
  Breadcrumb: { itemTextColor: t.body, itemTextColorHover: t.ink, itemTextColorActive: t.ink, separatorColor: t.body },
  Modal: { borderRadius: '24px' },
}
