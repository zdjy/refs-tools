# FS-0012：裁判端 macOS 毛玻璃 UI 改版

- 状态：已实现；自动化与 Chrome 浏览器验收通过，人工项见第 5 节。
- 范围：`apps/referee-web` 全部页面（首页、阅读、学习/工具/模块状态、GB 2312、工作台、登录/注册/账号、404）。
- 决策：[ADR 0020](../decisions/0020-macos-vibrancy-ui-baseline.md)。
- 视觉基线：[共享 UI 规范](../ui/macos_fiba.md)。工程映射：[样式规约](../agents/coding-standards/styles.md)。
- 不变：路由、业务行为、API、本地存储、断点、色板色值、文案与可访问性语义。

## 1. 目标与非目标

目标是让裁判端的圆角、阴影、动效、顶栏/侧栏分层与激活态符合新规范。非目标是改变信息架构、新增页面或调整业务逻辑；管理端不在范围内。

## 2. 视觉要求

| 项目 | 要求 |
| --- | --- |
| 圆角 | 卡片/面板/输入框/导航项 12px；窗口级容器与特征横幅 16px；按钮、标签胶囊；不出现 24px。 |
| 边框 | 全部 1px 暖调 `line`；不使用 `border-2` 及以上。阅读页引文线为 1px。 |
| 阴影 | 微层、浮雕、悬停浮升、激活导航四级暖调低透明度阴影；无 `shadow-2xl`、发光。 |
| 动效 | 主过渡 200ms `ease-out`；悬停抬升 2px；按压 `active:scale-95/[.98]`；入场动画 0.4s；不引起布局位移。 |
| 毛玻璃 | 顶栏 `bg-canvas/90 backdrop-blur-md`；移动底栏 `bg-canvas/85 backdrop-blur-xl`；工作台侧栏 `bg-soft/80 backdrop-blur-xl`。 |
| 激活态 | 导航、阅读目录、论坛版块、工作台会话为沙金底加微阴影；桌面主导航附球场红指示点，移动底栏图标为球场红。 |
| 聚焦 | 文本输入：红色 2px ring（30%）加 40% 红边框；按钮、链接、摘要：2px 实线球场红轮廓。 |
| 排印 | 眉题 `text-xs font-bold uppercase tracking-wider`，小号红字用 `red-hover`；编号与参数用 `font-mono`。 |
| 渐变与冷色 | 禁止渐变、冷灰/冷蓝黑；首页收尾面板由炭黑块改为沙金块。 |

## 3. 窄范围例外

- 按钮、链接、摘要的聚焦环使用实线轮廓而非规范的 30% 光环：后者对非文本控件的对比度不足 3:1。文本输入仍按规范。
- 小号红色眉题使用 `#BA2F17` 而非 `#D83A1E`，以满足 WCAG AA。
- 场边操作页继续沿用 FS-0002 对紧凑间距的例外，不套用规范中的营销留白。
- 品牌几何折面的 `clip-path` 保留为局部 CSS（`auth.css`）及内联任意值。

## 4. 验收标准

1. `pnpm --filter @refs-tools/referee-web test`、`typecheck`、`build`、`test:styles` 全部通过；样式检查确认新阴影、毛玻璃类生成且 `rounded-3xl`、`shadow-2xl` 不进入产物。
2. 源码检索无 `rounded-3xl`、`bg-gradient`、`border-2` 及以上、`animate-bounce/pulse/spin`、`duration-300`。
3. 320px 宽度下首页、阅读、登录、GB 2312、工作台无页面级横向溢出，且链接与按钮不小于 44×44px。
4. 键盘聚焦在输入框出现红色 ring 与边框；Tab 聚焦的按钮/链接有可见轮廓。
5. 系统 reduced-motion 下过渡与入场动画关闭，内容默认可见。

## 5. 验证记录与人工项

- 自动化：15 个测试文件 74 项通过；`typecheck`、生产构建、`test:styles` 通过。
- Chrome 浏览器：1280/1440 桌面截图检查首页与阅读页，320px 对 `/`、`/workbench`、`/read/pregame-briefing`、`/login`、`/tools/gb2312` 检查无横向溢出且无小于 44px 目标；输入框聚焦样式已验证。
- 未覆盖：真机 Safari 对 `backdrop-filter` 的渲染；账号已登录态、弹窗和工作台有会话时的逐页视觉比对；系统级 reduced-motion 的实机切换。这些项需人工补充验收。
