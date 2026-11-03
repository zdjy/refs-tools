// 色值与阴影取自 docs/ui/macos_fiba.md（macOS 毛玻璃 · FIBA 暖沙金）；工程映射规则见样式规约。
export const uiTokens = {
  canvas: '#FAF8F5', sand: '#EBE4D8', facet: '#DDD4C5', surface: '#FFFFFF', soft: '#F5F2EB',
  ink: '#111111', body: '#635E57', muted: '#8C867E', line: '#E2DDD5',
  red: '#D83A1E', redHover: '#BA2F17', green: '#1B8754', black: '#000000',
  // 暖调微阴影四级：微层卡片、浮雕主卡片、悬停浮升、激活导航项。
  shadow: '0 2px 8px rgba(27, 22, 16, 0.03)', raised: '0 4px 16px rgba(27, 22, 16, 0.05)',
  lift: '0 12px 32px rgba(27, 22, 16, 0.08)', selected: '0 1px 3px rgba(27, 22, 16, 0.04)',
  // 聚焦环对应 ring-2 + 球场红 30% 透明度；边框对应 border-red/40。
  focus: '0 0 0 2px rgba(216, 58, 30, 0.3)', focusBorder: 'rgba(216, 58, 30, 0.4)',
  font: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
} as const

/** 将共享 token 注入根节点的 CSS 变量，使页面样式与组件库主题共用同一来源（ADR 0007）。 */
export function applyUiTokens(root: { style: Pick<CSSStyleDeclaration, 'setProperty'> }): void {
  for (const [name, value] of Object.entries(uiTokens)) {
    root.style.setProperty(`--${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`, value)
  }
}
