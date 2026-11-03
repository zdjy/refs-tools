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
  info: string;
  success: string;
  successHover: string;
  warning: string;
  warningHover: string;
  error: string;
  errorHover: string;
  shadow: string;
}

export const adminColorPalettes = {
  '#D83A1E': 'FIBA Court Red',
  '#BA2F17': 'Deep Court Red',
  '#111111': 'Charcoal',
  '#635E57': 'Warm Stone',
  '#8C867E': 'Muted Stone',
  '#D4A017': 'Heritage Gold',
  '#1B8754': 'Official Green',
} as const;

const neutral = {
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
    onPrimary: '#FFFFFF',
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
    onPrimary: '#111111',
    info: '#DDD4C5',
    success: '#69BD92',
    successHover: '#8BCDAA',
    warning: '#D4A017',
    warningHover: '#E4B743',
    error: '#EF7057',
    errorHover: '#F28B77',
    shadow: '0 2px 8px rgb(0 0 0 / 24%)',
  },
} as const;

const accentPalettes = {
  '#D83A1E': { primaryHover: '#BA2F17' },
  '#BA2F17': { primaryHover: '#8F2412' },
  '#111111': { primaryHover: '#35312C' },
  '#635E57': { primaryHover: '#49443F' },
  '#8C867E': { primaryHover: '#706A63' },
  '#D4A017': { primaryHover: '#A77D0B' },
  '#1B8754': { primaryHover: '#166D44' },
} as const;

export const DEFAULT_ADMIN_ACCENT = '#D83A1E';
export type AdminAccent = keyof typeof accentPalettes;
export const adminAccentList = Object.keys(accentPalettes) as AdminAccent[];

export function getAdminPalette(accent: string, dark: boolean): AdminPalette {
  const base = neutral[dark ? 'dark' : 'light'];
  const selectedAccent = accentPalettes[accent as AdminAccent] ?? accentPalettes[DEFAULT_ADMIN_ACCENT];
  return {
    ...base,
    primary: dark && accent === DEFAULT_ADMIN_ACCENT ? '#EF7057' : accent,
    primaryHover:
      dark && accent === DEFAULT_ADMIN_ACCENT ? '#F28B77' : selectedAccent.primaryHover,
    onPrimary: dark ? base.onPrimary : accent === '#D4A017' ? '#111111' : '#FFFFFF',
  };
}

export function getLoginPalette(dark: boolean): AdminPalette {
  const palette = getAdminPalette(dark ? '#EBE4D8' : '#111111', dark);
  return {
    ...palette,
    primaryHover: palette.body,
    error: palette.primary,
    errorHover: palette.body,
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
