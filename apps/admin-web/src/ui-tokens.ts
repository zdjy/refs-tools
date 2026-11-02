export const uiTokens = {
  canvas: '#FAF8F5', sand: '#EBE4D8', facet: '#DDD4C5', surface: '#FFFFFF', soft: '#F5F2EB',
  ink: '#111111', body: '#635E57', muted: '#8C867E', line: '#E2DDD5',
  red: '#D83A1E', redHover: '#BA2F17', green: '#1B8754', black: '#000000',
  shadow: '0 2px 8px rgba(27, 22, 16, 0.03)', focus: '0 0 0 3px rgba(216, 58, 30, 0.3)',
  font: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
} as const

/** 管理端独立注入共享视觉规范的 token，不跨应用引用实现文件。 */
export function applyUiTokens(root: { style: Pick<CSSStyleDeclaration, 'setProperty'> }): void {
  for (const [name, value] of Object.entries(uiTokens)) {
    root.style.setProperty(`--${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`, value)
  }
}
