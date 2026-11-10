/**
 * 管理端尺度 token 唯一来源：排版、间距、圆角、动效、密度。
 *
 * 语义与取值见 `docs/specs/0010-admin-color-theme.md` §3.2–§3.4。
 * 与 `uiPalette.ts` 一起注入 `--admin-*` CSS 变量；Tailwind 与页面自有样式只消费变量。
 */

export type AdminDensity = 'compact' | 'comfortable';

/** 字号 / 行高 / 字重 / 字距，按语义角色命名。 */
export const typography = {
  pageTitle: { fontSize: '20px', lineHeight: '28px', fontWeight: '600', letterSpacing: '-0.01em' },
  sectionTitle: { fontSize: '15px', lineHeight: '22px', fontWeight: '600', letterSpacing: '-0.005em' },
  dialogTitle: { fontSize: '16px', lineHeight: '24px', fontWeight: '600', letterSpacing: '-0.01em' },
  body: { fontSize: '13px', lineHeight: '20px', fontWeight: '400', letterSpacing: '0' },
  bodyStrong: { fontSize: '13px', lineHeight: '20px', fontWeight: '500', letterSpacing: '0' },
  meta: { fontSize: '12px', lineHeight: '16px', fontWeight: '400', letterSpacing: '0.01em' },
  tableHead: { fontSize: '12px', lineHeight: '16px', fontWeight: '500', letterSpacing: '0.02em' },
  badge: { fontSize: '12px', lineHeight: '16px', fontWeight: '500', letterSpacing: '0' },
} as const;

/** 4px 基数间距刻度。 */
export const space = {
  xxs: '2px',
  xs: '4px',
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  xxl: '20px',
  '2xl': '24px',
  '3xl': '32px',
  '4xl': '40px',
  '5xl': '48px',
} as const;

/** 圆角只允许四档：4 / 6 / 8 / 全圆（仅头像与状态点）。 */
export const radius = {
  sm: '4px',
  md: '6px',
  lg: '8px',
  full: '9999px',
} as const;

export const motion = {
  fast: '120ms',
  base: '160ms',
  pop: '200ms',
  easeOut: 'cubic-bezier(0.2, 0, 0, 1)',
  easePop: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

export interface DensityMetrics {
  rowHeight: string;
  headHeight: string;
  controlHeight: string;
  iconButton: string;
  navItem: string;
}

/** 桌面密度档位；触屏与窄屏的 44px 放大由 CSS 媒体查询强制覆盖。 */
const densityMetrics: Record<AdminDensity, DensityMetrics> = {
  compact: {
    rowHeight: '36px',
    headHeight: '32px',
    controlHeight: '32px',
    iconButton: '28px',
    navItem: '32px',
  },
  comfortable: {
    rowHeight: '44px',
    headHeight: '36px',
    controlHeight: '32px',
    iconButton: '28px',
    navItem: '32px',
  },
};

export function getDensityMetrics(density: AdminDensity): DensityMetrics {
  return densityMetrics[density];
}

export function isAdminDensity(value: unknown): value is AdminDensity {
  return value === 'compact' || value === 'comfortable';
}

function toKebabCase(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/**
 * 展开成 CSS 变量：
 * - `--admin-space-*`、`--admin-radius-*`、`--admin-motion-*`
 * - `--admin-font-*` / `--admin-leading-*` / `--admin-weight-*`
 *
 * 密度变量（`--admin-row-height` 等）**不在这里输出**：它们必须留在 CSS 中
 * 按 `data-density` 属性与媒体查询取值，内联注入会盖过触屏 44px 放大。
 */
export function getScaleCssVariables(): Record<string, string> {
  const variables: Record<string, string> = {};

  for (const [name, value] of Object.entries(space)) {
    variables[`--admin-space-${name}`] = value;
  }
  for (const [name, value] of Object.entries(radius)) {
    variables[`--admin-radius-${name}`] = value;
  }
  for (const [name, value] of Object.entries(motion)) {
    variables[`--admin-motion-${toKebabCase(name)}`] = value;
  }

  // 排版按角色展开，页面只引用角色变量，不直接写 px 字号。
  const roleKeys: Record<keyof typeof typography, string> = {
    pageTitle: 'page-title',
    sectionTitle: 'section-title',
    dialogTitle: 'dialog-title',
    body: 'body',
    bodyStrong: 'body-strong',
    meta: 'meta',
    tableHead: 'table-head',
    badge: 'badge',
  };
  for (const [role, key] of Object.entries(roleKeys)) {
    const style = typography[role as keyof typeof typography];
    variables[`--admin-text-${key}-size`] = style.fontSize;
    variables[`--admin-text-${key}-leading`] = style.lineHeight;
    variables[`--admin-text-${key}-weight`] = style.fontWeight;
    variables[`--admin-text-${key}-tracking`] = style.letterSpacing;
  }

  return variables;
}
