import type { GlobalThemeOverrides } from 'naive-ui';
import { lighten } from '@/utils/index';

/** 仅映射 FIBA 颜色，保留上游主题切换、组件尺寸与交互。 */
export function getColorTheme(appTheme: string, dark: boolean): GlobalThemeOverrides {
  const primary = dark && appTheme === '#D83A1E' ? '#EF7057' : appTheme;
  const hover = appTheme === '#D83A1E' ? (dark ? '#F28B77' : '#BA2F17') : lighten(primary, 6);
  return {
    common: {
      primaryColor: primary,
      primaryColorHover: hover,
      primaryColorPressed: hover,
      primaryColorSuppl: primary,
      bodyColor: dark ? '#111111' : '#FAF8F5',
      cardColor: dark ? '#211E1A' : '#FFFFFF',
      modalColor: dark ? '#211E1A' : '#FFFFFF',
      popoverColor: dark ? '#211E1A' : '#FFFFFF',
      tableColor: dark ? '#211E1A' : '#FFFFFF',
      tableHeaderColor: dark ? '#2C2721' : '#F5F2EB',
      inputColor: dark ? '#2C2721' : '#F5F2EB',
      inputColorDisabled: dark ? '#211E1A' : '#F5F2EB',
      actionColor: dark ? '#2C2721' : '#F5F2EB',
      textColorBase: dark ? '#FAF8F5' : '#111111',
      textColor1: dark ? '#FAF8F5' : '#111111',
      textColor2: dark ? '#DDD4C5' : '#635E57',
      textColor3: dark ? '#B6ADA0' : '#635E57',
      placeholderColor: dark ? '#B6ADA0' : '#635E57',
      borderColor: dark ? '#494239' : '#E2DDD5',
      dividerColor: dark ? '#494239' : '#E2DDD5',
      hoverColor: dark ? '#2C2721' : '#F5F2EB',
      invertedColor: '#111111',
      infoColor: dark ? '#DDD4C5' : '#635E57',
      infoColorHover: dark ? '#EBE4D8' : '#111111',
      infoColorPressed: dark ? '#B6ADA0' : '#111111',
      infoColorSuppl: dark ? '#DDD4C5' : '#635E57',
      successColor: dark ? '#69BD92' : '#1B8754',
      successColorHover: dark ? '#8BCDAA' : '#166D44',
      successColorPressed: dark ? '#69BD92' : '#166D44',
      successColorSuppl: dark ? '#69BD92' : '#1B8754',
      warningColor: dark ? '#D4A017' : '#8A650A',
      warningColorHover: dark ? '#E4B743' : '#705208',
      warningColorPressed: dark ? '#D4A017' : '#705208',
      warningColorSuppl: dark ? '#D4A017' : '#8A650A',
      errorColor: dark ? '#EF7057' : '#D83A1E',
      errorColorHover: dark ? '#F28B77' : '#BA2F17',
      errorColorPressed: dark ? '#EF7057' : '#BA2F17',
      errorColorSuppl: dark ? '#EF7057' : '#D83A1E',
    },
    Button: {
      colorPrimary: dark ? '#EBE4D8' : '#111111',
      colorHoverPrimary: dark ? '#DDD4C5' : '#635E57',
      colorPressedPrimary: dark ? '#DDD4C5' : '#111111',
      textColorPrimary: dark ? '#111111' : '#FFFFFF',
      textColorHoverPrimary: dark ? '#111111' : '#FFFFFF',
      textColorPressedPrimary: dark ? '#111111' : '#FFFFFF',
      borderPrimary: dark ? '1px solid #EBE4D8' : '1px solid #111111',
      borderHoverPrimary: dark ? '1px solid #DDD4C5' : '1px solid #635E57',
      borderPressedPrimary: dark ? '1px solid #DDD4C5' : '1px solid #111111',
    },
    Menu: {
      itemColorActive: dark ? '#2C2721' : '#EBE4D8',
      itemColorActiveHover: dark ? '#494239' : '#DDD4C5',
      itemColorActiveInverted: '#EBE4D8',
      itemColorActiveHoverInverted: '#DDD4C5',
      itemTextColorActiveInverted: '#111111',
      itemTextColorActiveHoverInverted: '#111111',
      itemIconColorActiveInverted: '#D83A1E',
      itemIconColorActiveHoverInverted: '#BA2F17',
    },
    LoadingBar: {
      colorLoading: primary,
    },
  };
}
