/**
 * 管理端颜色 token 唯一来源。
 *
 * 语义与取值见 `docs/specs/0010-admin-color-theme.md` §3.1。
 * 修改本文件后必须同步规范文档与 `colorTheme.ts` 的 Naive UI 映射。
 */

export interface AdminPalette {
  canvas: string;
  surface: string;
  surfaceRaised: string;
  surfaceMuted: string;
  surfaceSunken: string;
  line: string;
  lineStrong: string;
  ink: string;
  body: string;
  muted: string;
  accent: string;
  accentHover: string;
  accentSoft: string;
  onAccent: string;
  solid: string;
  solidHover: string;
  onSolid: string;
  success: string;
  successHover: string;
  warning: string;
  warningHover: string;
  danger: string;
  dangerHover: string;
  info: string;
  shadow: string;
  shadowPop: string;
  shadowModal: string;
}

/** 状态标签的浅色底，由状态色按固定透明度推导，避免在页面里写 rgb()。 */
export interface AdminStatusSurface {
  success: string;
  warning: string;
  danger: string;
  neutral: string;
}

const palettes: Record<'light' | 'dark', AdminPalette> = {
  light: {
    canvas: '#FBFBFA',
    surface: '#FFFFFF',
    surfaceRaised: '#FFFFFF',
    surfaceMuted: '#F4F4F3',
    surfaceSunken: '#F7F7F6',
    line: '#E6E6E4',
    lineStrong: '#D6D6D3',
    ink: '#0D0D0C',
    body: '#55534F',
    muted: '#8A8884',
    accent: '#D83A1E',
    accentHover: '#BA2F17',
    accentSoft: '#FDEEEA',
    onAccent: '#FFFFFF',
    solid: '#0D0D0C',
    solidHover: '#2A2825',
    onSolid: '#FFFFFF',
    success: '#1B8754',
    successHover: '#166D44',
    warning: '#8A650A',
    warningHover: '#705208',
    danger: '#D83A1E',
    dangerHover: '#BA2F17',
    info: '#55534F',
    shadow: '0 1px 2px rgb(13 13 12 / 4%)',
    shadowPop: '0 4px 12px -2px rgb(13 13 12 / 8%), 0 2px 4px -2px rgb(13 13 12 / 4%)',
    shadowModal: '0 16px 48px -8px rgb(13 13 12 / 18%)',
  },
  dark: {
    canvas: '#0B0B0C',
    surface: '#141416',
    surfaceRaised: '#1B1B1E',
    surfaceMuted: '#1F1F23',
    surfaceSunken: '#0E0E10',
    line: '#26262A',
    lineStrong: '#34343A',
    ink: '#EDEDEF',
    body: '#A2A2A8',
    muted: '#6F6F77',
    accent: '#F0705A',
    accentHover: '#F78D79',
    accentSoft: '#2A1915',
    onAccent: '#0B0B0C',
    solid: '#EDEDEF',
    solidHover: '#FFFFFF',
    onSolid: '#0B0B0C',
    success: '#5CC08E',
    successHover: '#7BD3A6',
    warning: '#D9AC55',
    warningHover: '#E8C071',
    danger: '#F0705A',
    dangerHover: '#F78D79',
    info: '#A2A2A8',
    shadow: '0 1px 2px rgb(0 0 0 / 60%)',
    shadowPop: '0 4px 16px rgb(0 0 0 / 40%)',
    shadowModal: '0 16px 48px rgb(0 0 0 / 56%)',
  },
};

export function getAdminPalette(dark: boolean): AdminPalette {
  return palettes[dark ? 'dark' : 'light'];
}

/**
 * 登录页沿用 FS-0009 的中性配色例外：不使用篮球场红作为品牌色，
 * 只替换主操作与危险色，其余 token 与管理端一致。
 */
export function getLoginPalette(dark: boolean): AdminPalette {
  const palette = getAdminPalette(dark);
  return {
    ...palette,
    accent: dark ? '#FAF8F5' : '#111111',
    accentHover: dark ? '#DDD4C5' : '#635E57',
    accentSoft: dark ? '#2A2825' : '#F4F4F3',
    onAccent: dark ? '#111111' : '#FFFFFF',
    solid: dark ? '#FAF8F5' : '#111111',
    solidHover: dark ? '#FFFFFF' : '#333130',
    onSolid: dark ? '#111111' : '#FFFFFF',
    danger: dark ? '#FAF8F5' : '#111111',
    dangerHover: dark ? '#DDD4C5' : '#635E57',
  };
}

/** 状态标签底色：与状态色同色相的 12% / 14% 透明层。 */
export function getStatusSurfaces(dark: boolean): AdminStatusSurface {
  return dark
    ? {
        success: 'rgb(92 192 142 / 14%)',
        warning: 'rgb(217 172 85 / 14%)',
        danger: 'rgb(240 112 90 / 16%)',
        neutral: 'rgb(31 31 35 / 100%)',
      }
    : {
        success: 'rgb(27 135 84 / 12%)',
        warning: 'rgb(138 101 10 / 12%)',
        danger: 'rgb(216 58 30 / 12%)',
        neutral: 'rgb(244 244 243 / 100%)',
      };
}

function toKebabCase(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/** 把 palette 展开成 `--admin-*` CSS 变量，供布局与页面自有样式消费。 */
export function getPaletteCssVariables(palette: AdminPalette): Record<string, string> {
  const variables: Record<string, string> = {};
  for (const [name, value] of Object.entries(palette)) {
    variables[`--admin-${toKebabCase(name)}`] = value;
  }
  return variables;
}

/** 状态标签底色变量，与管理端 palette 一同注入根节点。 */
export function getStatusCssVariables(dark: boolean): Record<string, string> {
  const surfaces = getStatusSurfaces(dark);
  return Object.fromEntries(
    Object.entries(surfaces).map(([name, value]) => [`--admin-status-${name}`, value])
  );
}
