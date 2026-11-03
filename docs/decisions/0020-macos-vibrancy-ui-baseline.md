# ADR 0020：裁判端 UI 基线切换为 macOS 毛玻璃（FIBA 暖沙金）规范

- 状态：已接受
- 关联：[FS-0012](../specs/0012-macos-vibrancy-ui.md)、[ADR 0007](0007-vue-ui-framework.md)、[ADR 0013](0013-tailwindcss-styling.md)、[ADR 0019](0019-motion-and-simulated-forum-content.md)
- 替代：原《FIBA 官网·暖沙金机构版》UI 规范（`docs/ui/fiba_about_ui_specification.md`，已删除）

## 背景

原规范以官网营销版式为蓝本：大圆角（最高 24px）、300–500ms 弹簧缓动、`py-20/28` 的大留白，与场边密集操作的工作台并不贴合。用户提供了新的 [macOS 毛玻璃规范](../ui/macos_fiba.md)，保留同一套暖沙金配色，改用桌面应用式的分层、毛玻璃、克制圆角与 200ms 动效，并要求前端按它重做、旧规范相关文档同步替换。

## 决策

1. [`docs/ui/macos_fiba.md`](../ui/macos_fiba.md) 成为裁判端唯一 UI 基线，旧规范文件删除，仓库内的引用统一改指向新规范。
2. 色板 token 不变；新增 token：阴影三级（`raised`、`lift`、`selected`）、聚焦边框 `focus-border`，聚焦环改为 2px、球场红 30%。
3. 圆角收敛：卡片、面板、输入框、导航项 `rounded-xl`（12px），应用窗口级容器和特征横幅 `rounded-2xl`（16px），按钮与标签 `rounded-full`；移除 24px。Naive UI 主题同步。
4. 动效：主过渡 `200ms ease-out`，由 Tailwind `@theme` 设为默认；入场动画缩短为 0.4s；图片缩放保留 500ms。
5. 顶栏、移动底栏与工作台侧栏使用 `backdrop-blur` 加暖白半透明底；导航与板块的激活态为沙金底加微阴影，主导航桌面端附球场红指示点。
6. 首页收尾面板由炭黑深色块改为暖沙金块，满足「沙金底上不使用低对比文字」与去除深色块的方向。
7. 规范中小号红字（`text-xs` 眉题）在沙金与白底上使用 `red-hover`（`#BA2F17`）以满足 WCAG AA；`#D83A1E` 仅用于图标、指示点和 ≥18px 文本。

## 备选方案

- 仅调整 token 数值、不改结构：无法体现毛玻璃分层与导航激活态，且 `rounded-3xl` 等类仍与新规范冲突。
- 保留旧规范用于营销页、新规范用于工作台：会形成两套视觉系统，违反 AGENTS.md 对单一基线的要求。

## 后果

- 视觉与交互取值只在新规范和[样式规约](../agents/coding-standards/styles.md)维护；ADR 0013、0019 中涉及旧规范的措辞为历史记录，不回改。
- `backdrop-filter` 在低端设备上有合成开销，仅用于固定的顶栏、底栏和侧栏，不用于大面积内容区。
- 管理端 `apps/admin-web` 仅引用配色，不在本次变更范围。
