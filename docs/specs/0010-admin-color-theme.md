# FS-0010：管理端深浅两套配色规范

## 1. 文档状态

- 状态：已确认，供管理端 UI 开发与主题收敛使用
- 适用范围：`apps/admin-web`
- 关联规范：[共享 FIBA UI 规范](../ui/fiba_about_ui_specification.md)、[样式规约](../agents/coding-standards/styles.md)
- 关联规格：[FS-0009：管理端登录页中性配色](./0009-admin-login-colors.md)

## 2. 背景与目标

管理端仅保留两套配色：浅色主题和深色主题。主题切换只改变明暗表面、文字、边框及对应交互状态，不再提供多种品牌强调色或导航风格组合。

本规范沿用 FIBA UI 规范的暖沙金、暖白、炭黑与篮球场红，适配管理端的导航、表格、表单、弹窗和数据密集型工作场景。管理端应保持紧凑、清晰和高对比度，不机械套用官网展示页的大留白布局。

### 2.1 目标

- 统一管理端 Light / Dark 两套主题的颜色语义和组件映射。
- 浅色主题使用浅色侧边栏，避免大面积深色导航。
- 深色主题使用独立的暖黑侧边栏，与炭黑页面画布形成轻微层次。
- 固定篮球场红为品牌主操作色；深色主题使用提亮后的红色以保证可读性。
- 让 Naive UI 主题、CSS 变量和页面自有样式消费同一套语义 token。
- 保留成功、警告、错误等功能状态色，但不把它们作为可选品牌主题。

### 2.2 非目标

- 本规格不改变业务规则、权限、路由、数据结构或登录流程。
- 本规格不要求本次同步完成管理端 Tailwind 3 到 Tailwind 4 的迁移；该差异按现有迁移计划单独处理。
- 本规格不重新设计页面布局、图标、字体或动效。
- 本规格不允许新增第三套高对比、彩色或导航专属主题。

## 3. 主题模型

主题由 `darkTheme` 单一布尔状态决定：

```text
false → Light / 暖白浅色
true  → Dark / 暖黑深色
```

以下配置不再作为主题选择项：

- 多品牌强调色
- 暗色侧边栏 / 白色侧边栏 / 暗色顶栏的组合选择
- 以红色、金色、绿色或炭黑命名的独立主题

导航风格由当前明暗主题自动决定：

```text
Light：白色侧边栏 + 暖白画布
Dark ：暖黑侧边栏 + 炭黑画布
```

## 4. 颜色 Token

实现必须使用语义 token，不在业务页面重复硬编码以下色值。色值是本规格的唯一配色依据；共享 FIBA 规范中的示例 class 仅作为视觉参考。

### 4.1 Light / 暖白浅色

| Token | 色值 | 语义与用途 |
| --- | --- | --- |
| `canvas` | `#FAF8F5` | 页面全局画布、内容区背景 |
| `surface` | `#FFFFFF` | 卡片、表格、弹窗和普通内容表面 |
| `surfaceRaised` | `#FFFFFF` | 抽屉、下拉菜单、悬浮面板 |
| `surfaceMuted` | `#F5F2EB` | 表格表头、筛选区、输入框、次级表面 |
| `sand` | `#EBE4D8` | 当前菜单、选中项、轻量品牌背景 |
| `sandDeep` | `#DDD4C5` | 选中悬停、强调层、几何折面 |
| `ink` | `#111111` | 标题、主要正文、主要图标 |
| `body` | `#635E57` | 正文、描述、次要操作 |
| `muted` | `#8C867E` | 占位符、辅助说明、禁用文字 |
| `line` | `#E2DDD5` | 边框、分割线、表格行线 |
| `primary` | `#D83A1E` | 主操作、链接、焦点、加载条 |
| `primaryHover` | `#BA2F17` | 主色悬停和按下状态 |
| `onPrimary` | `#FFFFFF` | 主色背景上的文字和图标 |
| `shadow` | `0 2px 8px rgb(27 22 16 / 5%)` | 暖调轻阴影 |

Light 侧边栏专用语义：

| Token | 色值 | 用途 |
| --- | --- | --- |
| `sidebar` | `#FFFFFF` | 侧边栏背景 |
| `sidebarHover` | `#F5F2EB` | 菜单悬停背景 |
| `sidebarActive` | `#EBE4D8` | 当前菜单背景 |
| `sidebarText` | `#635E57` | 普通菜单文字 |
| `sidebarActiveText` | `#111111` | 当前菜单文字 |
| `sidebarIcon` | `#8C867E` | 普通菜单图标 |
| `sidebarActiveIcon` | `#D83A1E` | 当前菜单图标 |
| `sidebarLine` | `#E2DDD5` | 侧边栏边框或分隔线 |

### 4.2 Dark / 暖黑深色

| Token | 色值 | 语义与用途 |
| --- | --- | --- |
| `canvas` | `#111111` | 页面全局画布、内容区背景 |
| `surface` | `#211E1A` | 卡片、表格、弹窗和普通内容表面 |
| `surfaceRaised` | `#2C2721` | 抽屉、下拉菜单、悬浮面板 |
| `surfaceMuted` | `#2C2721` | 表格表头、筛选区、输入框、次级表面 |
| `sand` | `#494239` | 当前菜单、选中项、轻量品牌背景 |
| `sandDeep` | `#5B5145` | 选中悬停、强调层 |
| `ink` | `#FAF8F5` | 标题、主要正文、主要图标 |
| `body` | `#DDD4C5` | 正文、描述、次要操作 |
| `muted` | `#B6ADA0` | 占位符、辅助说明、禁用文字 |
| `line` | `#494239` | 边框、分割线、表格行线 |
| `primary` | `#EF7057` | 主操作、链接、焦点、加载条 |
| `primaryHover` | `#F28B77` | 主色悬停和按下状态 |
| `onPrimary` | `#111111` | 主色背景上的文字和图标 |
| `shadow` | `0 2px 8px rgb(0 0 0 / 24%)` | 暖黑环境下的轻阴影 |

Dark 侧边栏专用语义：

| Token | 色值 | 用途 |
| --- | --- | --- |
| `sidebar` | `#211E1A` | 侧边栏背景；与 `canvas` 区分 |
| `sidebarHover` | `#2C2721` | 菜单悬停背景 |
| `sidebarActive` | `#494239` | 当前菜单背景 |
| `sidebarText` | `#B6ADA0` | 普通菜单文字 |
| `sidebarActiveText` | `#FAF8F5` | 当前菜单文字 |
| `sidebarIcon` | `#B6ADA0` | 普通菜单图标 |
| `sidebarActiveIcon` | `#EF7057` | 当前菜单图标 |
| `sidebarLine` | `#494239` | 侧边栏边框或分隔线 |

## 5. 功能状态色

功能状态色用于表达业务结果，不参与主题选择。浅色和深色使用不同亮度版本，以保证文字与背景可读。

| 状态 | Light | Dark | 典型用途 |
| --- | --- | --- | --- |
| 成功 `success` | `#1B8754` | `#69BD92` | 保存成功、审核通过、有效 |
| 成功悬停 | `#166D44` | `#8BCDAA` | 成功操作悬停 |
| 警告 `warning` | `#8A650A` | `#D4A017` | 待审核、风险、即将过期 |
| 警告悬停 | `#705208` | `#E4B743` | 警告操作悬停 |
| 错误 `error` | `#D83A1E` | `#EF7057` | 删除、失败、校验错误 |
| 错误悬停 | `#BA2F17` | `#F28B77` | 错误操作悬停 |
| 信息 `info` | `#635E57` | `#DDD4C5` | 普通提示、说明信息 |

状态不得只通过颜色表达。错误、警告和成功状态应同时提供文案、图标、标签或其他可识别信息。

## 6. 组件映射

### 6.1 导航

| 状态 | Light | Dark |
| --- | --- | --- |
| 侧边栏背景 | `sidebar` `#FFFFFF` | `sidebar` `#211E1A` |
| 菜单悬停 | `sidebarHover` `#F5F2EB` | `sidebarHover` `#2C2721` |
| 当前菜单 | `sidebarActive` `#EBE4D8` | `sidebarActive` `#494239` |
| 普通菜单文字 | `sidebarText` `#635E57` | `sidebarText` `#B6ADA0` |
| 当前菜单文字 | `sidebarActiveText` `#111111` | `sidebarActiveText` `#FAF8F5` |
| 普通图标 | `sidebarIcon` `#8C867E` | `sidebarIcon` `#B6ADA0` |
| 当前图标 | `sidebarActiveIcon` `#D83A1E` | `sidebarActiveIcon` `#EF7057` |

浅色侧边栏不使用炭黑背景；深色侧边栏不使用纯黑以外的新冷色。侧边栏和内容区必须通过背景、边框或选中态建立层级，不能仅依赖阴影。

### 6.2 页面、卡片与弹窗

- 页面背景使用 `canvas`。
- 卡片、表格和普通弹窗使用 `surface`。
- 抽屉、下拉菜单和悬浮面板使用 `surfaceRaised`。
- 页面中的筛选区、表头和输入框使用 `surfaceMuted`。
- 边框和分割线使用 `line`。
- 卡片使用暖调轻阴影，不使用渐变背景、霓虹效果或重阴影。

### 6.3 按钮

| 类型 | 背景 | 文字 | 说明 |
| --- | --- | --- | --- |
| 主操作 | `primary` | `onPrimary` | 提交、保存、创建等主要动作 |
| 次要操作 | `surfaceMuted` | `ink` | 取消、筛选、辅助操作 |
| 文字操作 | 透明 | `primary` | 链接和低权重操作 |
| 危险操作 | `error` | `onPrimary` | 删除、撤销等破坏性动作，需确认流程 |
| 禁用 | `surfaceMuted` | `muted` | 不以高对比度颜色表示可操作 |

主要操作按钮、登录按钮和破坏性操作按钮的可点击区域至少为 `44px` 高。按钮必须具有可见的悬停、聚焦、按下和禁用状态。

### 6.4 表格

| 区域 | Light | Dark |
| --- | --- | --- |
| 表格背景 | `#FFFFFF` | `#211E1A` |
| 表头背景 | `#F5F2EB` | `#2C2721` |
| 选中行 | `#EBE4D8` | `#494239` |
| 分割线 | `#E2DDD5` | `#494239` |
| 主要文字 | `#111111` | `#FAF8F5` |
| 辅助文字 | `#635E57` | `#DDD4C5` |

### 6.5 输入框

| 状态 | Light | Dark |
| --- | --- | --- |
| 背景 | `#F5F2EB` | `#2C2721` |
| 边框 | `#E2DDD5` | `#494239` |
| 聚焦边框 | `#D83A1E` | `#EF7057` |
| 占位文字 | `#8C867E` | `#B6ADA0` |
| 错误边框 | `#D83A1E` | `#EF7057` |

## 7. Naive UI 与 CSS 变量接入

### 7.1 单一来源

- `apps/admin-web/src/settings/uiPalette.ts` 维护两套 palette 和全部语义 token。
- `apps/admin-web/src/settings/colorTheme.ts` 将 palette 映射到 Naive UI `GlobalThemeOverrides`。
- 应用根部通过 CSS 变量向布局和必要的自有 DOM 提供 token。
- 页面组件不得为单页新增品牌色或重复 `theme-overrides`。

建议将 `AdminPalette` 扩展为包含以下导航 token：

```ts
interface AdminPalette {
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
```

### 7.2 主题接口收敛

管理端主题 API 应从“强调色 + 明暗模式”收敛为“明暗模式”：

```ts
getAdminPalette(dark: boolean)
getColorTheme(dark: boolean)
```

应移除或停止使用以下概念：

- `adminColorPalettes`
- `accentPalettes`
- `AdminAccent`
- `adminAccentList`
- `appTheme`
- `appThemeList`

如果为了兼容旧设置暂时保留字段，旧字段不得继续影响新主题的实际颜色，并应在迁移完成后删除。

### 7.3 登录页例外

登录页继续遵守 [FS-0009](./0009-admin-login-colors.md) 的中性配色例外：登录品牌区、主按钮、链接、聚焦和错误反馈不使用篮球场红。登录页只是页面级表现例外，不构成第三套管理端主题，也不得改变已登录管理端的颜色 token。

## 8. 禁止事项

- 禁止使用渐变背景，包括 `bg-gradient-*` 或等效 CSS 渐变。
- 禁止在页面组件中直接写主题 hex 色值替代语义 token。
- 禁止恢复多品牌强调色选择器或多种导航风格组合。
- 禁止使用冷蓝、紫色、霓虹色等偏离 FIBA 暖色基线的品牌色。
- 禁止使用大面积高饱和红色作为页面或侧边栏背景。
- 禁止使用 `shadow-2xl`、发光阴影或重装饰效果。
- 禁止移除键盘焦点状态，或仅通过颜色表达当前项、错误和禁用状态。
- 禁止用黑底白字作为浅色主题侧边栏的默认方案。

## 9. 验收标准

### 9.1 主题与结构

- [ ] 管理端只有 Light 和 Dark 两套主题可选。
- [ ] Light 主题侧边栏为 `#FFFFFF`，当前项为 `#EBE4D8`。
- [ ] Dark 主题侧边栏为 `#211E1A`，页面画布为 `#111111`，当前项为 `#494239`。
- [ ] 侧边栏、Naive UI 组件和页面自有元素均消费同一语义 token。
- [ ] 切换明暗主题不会改变业务状态、路由或权限行为。

### 9.2 状态与可访问性

- [ ] 主按钮、链接、输入框聚焦态和加载条使用当前主题的 `primary`。
- [ ] 深色主题主色使用 `#EF7057` / `#F28B77`，未直接复用浅色的深红色。
- [ ] 成功、警告、错误状态同时提供文本或图标等非颜色信息。
- [ ] 键盘可见焦点不被主题覆盖；主要交互控件触控区域至少为 `44px` 高。
- [ ] 320px 宽度下无页面级横向溢出。
- [ ] 在浏览器中检查 Light / Dark 的导航、表格、表单、弹窗、空状态、错误状态和禁用状态。

### 9.3 工程检查

- [ ] 运行管理端类型检查：`pnpm --filter naive-ui-admin type-check`。
- [ ] 运行管理端生产构建：`pnpm --filter naive-ui-admin build`。
- [ ] 检查主题 token 未散落在业务页面，未新增未说明的 `!important` 或深层组件选择器。
- [ ] 登录页按 FS-0009 单独验收，不将登录页中性色例外误判为管理端主题缺失。
