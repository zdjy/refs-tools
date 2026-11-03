export interface AdminPalette {
  canvas: string;
  surface: string;
  surfaceRaised: string;
  surfaceMuted: string;
  sand: string;
  sandDeep: string;
  ink: string;
  body: string;
  muted: string;
  line: string;
  primary: string;
  primaryHover: string;
  onPrimary: string;
  sidebar: string;
  sidebarHover: string;
  sidebarActive: string;
  sidebarText: string;
  sidebarActiveText: string;
  sidebarIcon: string;
  sidebarActiveIcon: string;
  sidebarLine: string;
  info: string;
  success: string;
  successHover: string;
  warning: string;
  warningHover: string;
  error: string;
  errorHover: string;
  shadow: string;
}

const palettes: Record<'light' | 'dark', AdminPalette> = {
  light: {
    canvas: '#FAF8F5',
    surface: '#FFFFFF',
    surfaceRaised: '#FFFFFF',
    surfaceMuted: '#F5F2EB',
    sand: '#EBE4D8',
    sandDeep: '#DDD4C5',
    ink: '#111111',
    body: '#635E57',
    muted: '#8C867E',
    line: '#E2DDD5',
    primary: '#D83A1E',
    primaryHover: '#BA2F17',
    onPrimary: '#FFFFFF',
    sidebar: '#FFFFFF',
    sidebarHover: '#F5F2EB',
    sidebarActive: '#EBE4D8',
    sidebarText: '#635E57',
    sidebarActiveText: '#111111',
    sidebarIcon: '#8C867E',
    sidebarActiveIcon: '#D83A1E',
    sidebarLine: '#E2DDD5',
    info: '#635E57',
    success: '#1B8754',
    successHover: '#166D44',
    warning: '#8A650A',
    warningHover: '#705208',
    error: '#D83A1E',
    errorHover: '#BA2F17',
    shadow: '0 2px 8px rgb(27 22 16 / 5%)',
  },
  dark: {
    canvas: '#111111',
    surface: '#211E1A',
    surfaceRaised: '#2C2721',
    surfaceMuted: '#2C2721',
    sand: '#494239',
    sandDeep: '#5B5145',
    ink: '#FAF8F5',
    body: '#DDD4C5',
    muted: '#B6ADA0',
    line: '#494239',
    primary: '#EF7057',
    primaryHover: '#F28B77',
    onPrimary: '#111111',
    sidebar: '#211E1A',
    sidebarHover: '#2C2721',
    sidebarActive: '#494239',
    sidebarText: '#B6ADA0',
    sidebarActiveText: '#FAF8F5',
    sidebarIcon: '#B6ADA0',
    sidebarActiveIcon: '#EF7057',
    sidebarLine: '#494239',
    info: '#DDD4C5',
    success: '#69BD92',
    successHover: '#8BCDAA',
    warning: '#D4A017',
    warningHover: '#E4B743',
    error: '#EF7057',
    errorHover: '#F28B77',
    shadow: '0 2px 8px rgb(0 0 0 / 24%)',
  },
};

export function getAdminPalette(dark: boolean): AdminPalette {
  return palettes[dark ? 'dark' : 'light'];
}

/** 登录页沿用 FS-0009 的中性品牌色，不改变已登录管理端主题。 */
export function getLoginPalette(dark: boolean): AdminPalette {
  const palette = getAdminPalette(dark);
  return {
    ...palette,
    primary: dark ? '#FAF8F5' : '#111111',
    primaryHover: dark ? '#DDD4C5' : '#635E57',
    onPrimary: dark ? '#111111' : '#FFFFFF',
    error: dark ? '#FAF8F5' : '#111111',
    errorHover: dark ? '#DDD4C5' : '#635E57',
  };
}

export function getPaletteCssVariables(palette: AdminPalette): Record<string, string> {
  return Object.fromEntries(
    Object.entries(palette).map(([name, value]) => [
      `--admin-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`,
      value,
    ])
  );
}
