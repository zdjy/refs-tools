// 色值取自 docs/ui/macos_fiba.md（暖沙金 FIBA 色板）；版式、材质与动效参考 Apple iOS，见 docs/ui/courtside.md。
export const uiTokens = {
  canvas: '#FAF8F5', sand: '#EBE4D8', facet: '#DDD4C5', surface: '#FFFFFF', soft: '#F5F2EB',
  ink: '#111111', body: '#635E57', muted: '#8C867E', line: '#E2DDD5',
  // 球场红：白字 4.62:1，只用于填充、图标、色点与大字；红色文字与选中态文字用 accentHover（白底 5.99:1）。
  accent: '#D83A1E', accentHover: '#BA2F17',
  // 色板只有一个红色，错误态复用它，不另立危险色；错误始终伴随文字与 role=alert，不单靠颜色。
  danger: '#BA2F17', dangerHover: '#BA2F17',
  // 荣耀金与正向绿同取自色板；金色底上用墨色图标（7.95:1），白色在金色上只有 2.38:1。
  gold: '#D4A017', green: '#1B8754', warning: '#D4A017', black: '#000000',
  // 阴影沿用色板的暖褐基色 rgba(27, 22, 16)：微层、浮雕、悬停三级，另有图标块的顶部高光与分段滑块。
  shadow: '0 0 0 1px rgba(27, 22, 16, 0.03), 0 2px 8px rgba(27, 22, 16, 0.03)',
  tile: 'inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 1px 2px rgba(27, 22, 16, 0.18)',
  raised: '0 4px 16px rgba(27, 22, 16, 0.05), 0 12px 32px rgba(27, 22, 16, 0.06)',
  lift: '0 12px 32px rgba(27, 22, 16, 0.08)', selected: '0 1px 3px rgba(27, 22, 16, 0.06)',
  // 聚焦环对应 ring-2 + 球场红 30%；边框对应 border-accent/40。
  focus: '0 0 0 2px rgba(216, 58, 30, 0.3)', focusBorder: 'rgba(216, 58, 30, 0.4)',
  // 优先使用苹果系统字体，中文回落到苹方；不加载远程字体，也不打包字体文件，见 ADR 0033。
  font: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "HarmonyOS Sans SC", "Noto Sans SC", "Microsoft YaHei UI", system-ui, sans-serif',
  // iOS 缓动曲线：easeIos 用于位移与浮入，spring 带轻微过冲，仅用于弹出与选中胶囊。
  easeIos: 'cubic-bezier(0.22, 1, 0.36, 1)', easeSpring: 'cubic-bezier(0.34, 1.4, 0.64, 1)',
  mono: 'ui-monospace, "SF Mono", "Cascadia Mono", Consolas, monospace',
} as const

/** 将共享 token 注入根节点的 CSS 变量，使页面样式与组件库主题共用同一来源（ADR 0007）。 */
export function applyUiTokens(root: { style: Pick<CSSStyleDeclaration, 'setProperty'> }): void {
  for (const [name, value] of Object.entries(uiTokens)) {
    root.style.setProperty(`--${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`, value)
  }
}
