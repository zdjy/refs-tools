import { adminColorPalettes, DEFAULT_ADMIN_ACCENT } from './uiPalette';

export const appThemeList = Object.keys(adminColorPalettes);

const setting = {
  //深色主题
  darkTheme: false,
  //系统主题色
  appTheme: DEFAULT_ADMIN_ACCENT,
  //系统内置主题色列表
  appThemeList,
};

export default setting;
