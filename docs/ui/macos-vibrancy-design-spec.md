# macOS 毛玻璃 设计规范

style_slug: macos-vibrancy

## 什么时候用
- 实现前需要统一团队或 AI 对这个风格的理解时使用。
- 把任务交给 AI 前，用它确定颜色、布局、组件、动效和可访问性的边界。
- 审核结果时，用它判断生成界面是否仍然属于这个风格。

## 怎么用
- 先读"概览"和"视觉系统"，理解这个风格的识别点。
- 把"布局规则"和"组件规则"当作实现边界。
- 交付前按"交付检查"逐条自检。

## 概览
macOS 原生暗色毛玻璃风格。通过多层深灰面板、系统级 backdrop-blur 和极度克制的装饰，还原桌面应用的沉稳质感。

## 设计意图
macOS Vibrancy 是 Apple 桌面应用设计语言的 Web 还原。它的核心不是炫技，而是克制。

## 视觉系统
- Primary: #3a3a3c
- Secondary: #1c1c1e
- Accents: #0a84ff, #30d158, #ff9f0a, #ff453a
- Signature cues: macOS、原生、暗色、毛玻璃、桌面、vibrancy、侧边栏、modern

## 布局规则
- 区块节奏：`py-12 md:py-16`
- 容器内边距：`px-4 md:px-6`
- 卡片内边距：`p-4 md:p-6`
- 默认间距：`gap-4`
- 圆角：`rounded-xl`

## 组件规则
- Use three-depth dark gray system: #1c1c1e (deepest) -> #2c2c2e -> #3a3a3c (lightest)
- Sidebar uses backdrop-blur-xl with bg-[#1c1c1e]/80 for vibrancy effect
- All borders are 1px border-white/8 to border-white/12, never thicker
- Headings use serif font (Georgia, serif), body uses system sans-serif
- Transitions are subtle: duration-200 ease-out, colors only
- Active nav items use slightly lighter background bg-white/8 to bg-white/12
- Code blocks use monospace font with bg-[#1c1c1e] background
- System accent color #0a84ff for interactive highlights

## 交互与动效
- 过渡：`transition-colors duration-200 ease-out`
- 悬停：`hover:bg-white/8`
- 按下：`active:opacity-80`
- 聚焦：`focus:shadow-[0_0_0_2px_rgba(100,100,255,0.3)]`
- 动效不得引发布局位移或抢走焦点。

## 可访问性
- 文字对比度保持 WCAG AA 或更高。
- 每个可交互元素都必须保留清晰键盘焦点。
- 移动端触控目标不低于 44px，并尊重 reduced-motion。

## 禁止项
- No gradients on any element (backgrounds are solid dark grays)
- No glow effects, no box-shadow larger than 2px spread
- No decorative animations (pulse, bounce, spin)
- No rounded-3xl or rounded-full (max rounded-xl)
- No bright accent colors as backgrounds (only for text highlights)
- No borders thicker than 1px

## 交付检查
- 替换示例内容后，页面仍应一眼识别为 macOS 毛玻璃。
- 按钮、卡片、输入、空状态、错误、加载状态应共享同一套视觉语言。
- 上面"禁止项"里的任何一条都没有被通用组件库的默认样式带进来。