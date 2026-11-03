import type { GlobalThemeOverrides } from 'naive-ui';
import { getAdminPalette, getLoginPalette, type AdminPalette } from './uiPalette';

function toNaiveTheme(palette: AdminPalette): GlobalThemeOverrides {
  return {
    common: {
      primaryColor: palette.primary,
      primaryColorHover: palette.primaryHover,
      primaryColorPressed: palette.primaryHover,
      primaryColorSuppl: palette.primary,
      bodyColor: palette.canvas,
      cardColor: palette.surface,
      modalColor: palette.surface,
      popoverColor: palette.surface,
      tableColor: palette.surface,
      tableHeaderColor: palette.surfaceMuted,
      inputColor: palette.surfaceMuted,
      inputColorDisabled: palette.surface,
      actionColor: palette.surfaceMuted,
      textColorBase: palette.ink,
      textColor1: palette.ink,
      textColor2: palette.body,
      textColor3: palette.muted,
      placeholderColor: palette.muted,
      borderColor: palette.line,
      dividerColor: palette.line,
      hoverColor: palette.surfaceMuted,
      invertedColor: palette.ink,
      infoColor: palette.info,
      infoColorHover: palette.body,
      infoColorPressed: palette.muted,
      infoColorSuppl: palette.info,
      successColor: palette.success,
      successColorHover: palette.successHover,
      successColorPressed: palette.successHover,
      successColorSuppl: palette.success,
      warningColor: palette.warning,
      warningColorHover: palette.warningHover,
      warningColorPressed: palette.warningHover,
      warningColorSuppl: palette.warning,
      errorColor: palette.error,
      errorColorHover: palette.errorHover,
      errorColorPressed: palette.errorHover,
      errorColorSuppl: palette.error,
    },
    Button: {
      colorPrimary: palette.primary,
      colorHoverPrimary: palette.primaryHover,
      colorPressedPrimary: palette.primaryHover,
      textColorPrimary: palette.onPrimary,
      textColorHoverPrimary: palette.onPrimary,
      textColorPressedPrimary: palette.onPrimary,
      borderPrimary: `1px solid ${palette.primary}`,
      borderHoverPrimary: `1px solid ${palette.primaryHover}`,
      borderPressedPrimary: `1px solid ${palette.primaryHover}`,
    },
    Menu: {
      itemColorActive: palette.sand,
      itemColorActiveHover: palette.sandDeep,
      itemColorActiveInverted: palette.sand,
      itemColorActiveHoverInverted: palette.sandDeep,
      itemTextColorActiveInverted: palette.ink,
      itemTextColorActiveHoverInverted: palette.ink,
      itemIconColorActiveInverted: palette.primary,
      itemIconColorActiveHoverInverted: palette.primaryHover,
    },
    LoadingBar: { colorLoading: palette.primary },
  };
}

export function getColorTheme(appTheme: string, dark: boolean): GlobalThemeOverrides {
  return toNaiveTheme(getAdminPalette(appTheme, dark));
}

export function getLoginColorTheme(dark: boolean): GlobalThemeOverrides {
  const palette = getLoginPalette(dark);
  const theme = toNaiveTheme(palette);
  return {
    ...theme,
    common: {
      ...theme.common,
      heightLarge: '44px',
      primaryColorHover: palette.primaryHover,
      primaryColorPressed: palette.primaryHover,
      errorColor: palette.primary,
      errorColorHover: palette.errorHover,
      errorColorPressed: palette.errorHover,
      errorColorSuppl: palette.primary,
    },
    Input: { borderRadius: '12px' },
    Button: { ...theme.Button, borderRadiusLarge: '9999px' },
  };
}
