# 样式规约：Tailwind CSS

本文件属于[全栈架构与编码规约](../coding-standards.md)，是样式工程约束的唯一维护来源。选型与迁移取舍见 [ADR 0013](../../decisions/0013-tailwindcss-styling.md)，视觉基线引用[共享 FIBA UI 规范](../../ui/fiba_about_ui_specification.md)。

## 1. 技术基线与职责

* **新增与迁移的界面使用 Tailwind CSS 4.x 工具类**，不再以手写纯 CSS 作为页面布局、间距、排版和状态的默认方案。Naive UI 继续负责基础交互组件，Tailwind 不替代组件库的语义、键盘行为和主题接口。
* `tailwindcss` 与 `@tailwindcss/vite` 只声明在实际使用它们的前端应用的 `devDependencies`，通过官方 Vite 插件构建静态 CSS；不得加入 API、contracts、domain 或生产运行时。
* 使用 v4 CSS-first 配置，不新增 `tailwind.config.js`、v3 `@tailwind` 指令或并行的 PostCSS/Autoprefixer 管线。新增插件、其他原子类框架或共享样式包前先记录 ADR。
* 当前应用的存量布局、排版和状态已迁移为工具类；全局基线与必要的局部例外仍保留 CSS。后续新增或迁移组件时同步清理失效规则，不恢复第二套纯 CSS 页面。迁移范围与验收记录见[迁移规格](../../specs/0004-tailwind-migration.md)。

## 2. 目录与文件职责

```text
apps/referee-web/
├── vite.config.ts            # 注册 Vue 与 Tailwind 官方插件
└── src/
    ├── ui-tokens.ts          # 颜色、字体、阴影、焦点等设计 token 单一来源
    ├── ui-theme.ts           # Naive UI 公开主题适配，消费同一 token
    ├── styles/
    │   ├── index.css        # 唯一全局入口：Tailwind → base
    │   ├── tailwind.css     # Tailwind layer、扫描范围及 @theme 映射
    │   └── base.css         # reset、根排版、触控、focus、reduced-motion 基线
    └── views/<feature>/
        ├── <Feature>View.vue # 模板内使用 Tailwind 静态类名与状态绑定
        ├── <feature>.css    # 仅在存在必要局部 CSS 例外时建立
        └── components/     # 页面私有展示组件
```

| 文件 | 允许内容 | 禁止内容 | 行数上限 |
| --- | --- | --- | --- |
| `ui-tokens.ts` | 色值、字体、阴影、焦点环等 token 及 CSS 变量注入 | 页面专属特例；在 CSS 中复制同名 token 的值 | 无硬性上限，按语义分组 |
| `styles/index.css` | 全局 `@import`，Tailwind 入口必须先引入 | 具体样式规则、页面样式导入 | 20 行 |
| `styles/tailwind.css` | layer 声明、Tailwind 导入、`@source`、`@theme` | 业务选择器、重复色值、全量扫描其他应用或依赖 | 150 行 |
| `styles/base.css` | 全局 reset、根排版、控件触控尺寸、焦点、reduced-motion | 业务类、页面布局、重复工具类 | 150 行 |
| `views/<feature>/<feature>.css` | 有说明的必要局部 CSS 例外 | 整页纯 CSS 布局、全局 reset、跨页面工具类 | 230 行 |

旧 `layout.css`、`utilities.css` 已删除，不重新建立自制布局或工具类集合。

`.vue` 继续遵守[前端规约](frontend.md)的 230 行上限；工具类增加模板长度也不得豁免。通过拆分真实展示子组件控制复杂度，不将类名挪进业务状态层来绕过限制。

## 3. Token 与响应式配置

* `ui-tokens.ts` 为颜色、字体、阴影和焦点值的唯一来源，应用入口先注入 CSS 变量再挂载。`tailwind.css` 用 `@theme inline` 映射，不复制色值；Naive UI 仍由 `ui-theme.ts` 消费相同 token。
* 使用语义工具类：`bg-canvas`、`bg-surface`、`bg-soft`、`text-ink`、`text-body`、`border-line`、`text-red`、`hover:text-red-hover`、`shadow-card`、`font-sans`。透明色、`currentColor` 可以使用；禁止框架默认品牌色、硬编码颜色任意值和页面内 token 重定义。
* 默认颜色、断点、圆角和阴影命名空间已重置。圆角限定 `rounded-xl`（12px）、`rounded-2xl`（16px）、`rounded-3xl`（24px）和 `rounded-full`；阴影使用 `shadow-card`，其他阴影先补充共享 token。Naive UI 组件通过公开主题接口维护相同取值。
* 断点统一为下表，使用无前缀类表达 320px 起的移动基础布局，再按 `xs → sm → compact → md → tablet → lg → xl → 2xl` 增强。不使用 Tailwind 默认断点含义、任意断点或 `max-*` 变体引入另一套布局策略；新增断点需在相关规格说明理由并集中配置。各布局按内容所需空间选择切换档位，不在同一断点机械启用所有多栏布局；本次细分理由与验收见[响应式适配规格](../../specs/0005-responsive-layout.md)。

| 变体 | 最小宽度 |
| --- | --- |
| `xs:` | 375px |
| `sm:` | 480px |
| `compact:` | 640px |
| `md:` | 768px |
| `tablet:` | 960px |
| `lg:` | 1100px |
| `xl:` | 1280px |
| `2xl:` | 1536px |

* 间距与字号优先使用 Tailwind 标准尺度；确需 `min-h-[44px]`、`grid-cols-[minmax(0,1fr)]` 等非主题数值时可使用任意值，但不得用其绕过颜色、圆角、阴影与断点约束。
* 共享 UI 规范中的十六进制工具类和阴影示例是视觉值参考，实际代码必须映射成现有语义 token；`bg-white` 对应 `bg-surface`。营销留白示例不能机械套用到场边密集操作页。

```html
<section class="grid grid-cols-1 gap-4 rounded-2xl border border-solid border-line bg-surface p-4 text-ink shadow-card md:grid-cols-2 md:p-6">
  <!-- 内容与交互组件按页面职责组装，不能只靠工具类补足可访问性。 -->
</section>
```

## 4. 类名、状态与扫描边界

* 构建扫描范围由 `tailwind.css` 中的 `source(none)` 和显式 `@source` 限定为本应用 `src/` 与 `index.html`，路径相对于该样式文件。不得扫描整个仓库、文档、构建产物或 `node_modules`；确需共享源组件时显式登记并说明所有者。
* 类名必须以完整静态字符串出现在被扫描源码中；允许 Vue 对象/数组绑定与静态映射，禁止 `` `bg-${color}` ``、`` `md:grid-cols-${count}` `` 等动态拼接。动态映射属于展示组件或 `*.presentation.ts`，不得让 API、domain、store 或业务 Composable 返回 Tailwind 类名。
* 不引入大范围 safelist 或 `@source inline()` 全量枚举来弥补动态拼接。连续动态数值使用受控内联 CSS 变量，再由静态工具类消费；不得通过内联样式绕过 token 或承载业务规则。
* 同一元素同一状态下不得绑定冲突工具类；HTML 中 class 的前后顺序不决定 CSS 优先级。复杂重复结构优先抽展示组件，不为缩短模板到处使用 `@apply` 重新发明语义类框架。
* 状态使用 `hover:`、`active:`、`disabled:`、`focus-visible:`、`motion-reduce:` 等变体；状态文案和图标不能省略，禁止只靠颜色传达运行、失败或禁用态。

## 5. 加载、层叠与 Naive UI 边界

* `main.ts` 在根组件之前导入唯一入口 `./styles/index.css`。Tailwind 声明 `theme → base → components → utilities` 层；普通声明在这些命名层之间按此顺序提升优先级，不能把 token 或主题接口描述成额外 CSS 优先级。
* **暂不导入 Preflight**，保留 `base.css` 的现有 reset 与可访问性基线。原生元素不能假定 Tailwind 已重置浏览器默认值，例如需要边框时显式使用 `border border-solid border-line`。后续启用 Preflight 必须单独评估 Naive UI、旧页面、表单和焦点回归。
* `base.css` 中的 reset、根排版和默认尺寸放在 `base` 层，以便自有 DOM 的工具类覆盖；按压反馈、键盘焦点和 reduced-motion 保持未分层，确保 Naive UI 不屏蔽这些全局基线。不得把整个组件库放入低优先级层或取消焦点来解决层叠。
* Naive UI 样式仍为未分层规则；同等来源的重要性下，未分层普通声明高于分层工具类，不能假定“Tailwind 最后加载就一定覆盖”。不在同一元素上用两套体系竞争同一属性；尺寸差异集中在 `ui-theme.ts` 的 `refereeControlThemes`，间距和选中背景优先放到自有外围 DOM，文字可放在自有 slot 节点。
* Tailwind 主要用于自有 DOM 和组件外围布局。Naive UI 的颜色、形状、尺寸与内部状态仍优先使用公开 props、slots 和 `ui-theme.ts`，不依赖工具类穿透其内部节点，不覆盖 `.n-*` 或以深层选择器修补。
* Modal preset 的 Card 未分层 `width:100%` 无法由分层工具类覆盖，使用集中维护的 `refereeModalStyle` 经公开 `style` 属性设置视口留白宽度；最大宽高、滚动仍用工具类。这是非主题尺寸适配的窄范围例外，不允许借此内联颜色、圆角或阴影。
* 禁止 `!important`、Tailwind important 修饰符和全局 important 模式。仅保留 `base.css` 已有、带原因说明的 reduced-motion 例外，用于压制第三方动效；其他情况通过职责边界解决。

## 6. 手写 CSS 例外与迁移

* 允许保留基础 reset、伪元素、复杂几何裁切、第三方公开接口无法满足的集中适配等必要 CSS；工具类不能合理表达时，在局部规则旁用简体中文说明原因。不得以“例外”为名新增整页纯 CSS 或使用 `@apply` 批量搬回原方案。
* 页面例外写入 `views/<feature>/<feature>.css`，由页面根组件的脚本导入；不由全局入口或子组件导入，不回流 `src/styles/`。必要的单组件例外可用 `<style scoped>`，单块不超过 40 行，不重定义主题值。禁止无 `scoped` 的 `<style>` 和样式块内的全局/页面 `@import`。
* 保留的语义类使用业务词汇与 kebab-case 命名，避免跨页面冲突。自定义媒体查询沿用上表的 `min-width` 断点、升序排列并合并同断点规则；禁止 `:deep()` 表达业务语义。
* 按组件或完整布局块迁移：先改模板与状态类绑定，再移除对应旧规则，检查其他使用者，最后删除无引用文件与导入。不只给旧 class 追加几个工具类后宣称迁移完成，不顺带改动业务行为。

## 7. 交付检查

* 执行相关单测、`typecheck` 和生产构建；使用 `pnpm --filter @refs-tools/referee-web test:styles` 独立验证语义 token、全部八档断点、状态变体及任意值类确实生成，且无默认调色板、Preflight 或扫描范围外规则意外进入产物。该命令执行内存构建，不并入低内存单测。
* 比较构建前后的 CSS/JS 体积；Tailwind 只参与构建，不能因此增加生产前端服务、远程字体/CDN 或私有数据缓存。浏览器基线及兼容性取舍见 ADR 0013。
* 组件迁移必须另做浏览器验收：320px 移动端及桌面无页面级横向溢出、44×44px 触控目标、可访问名称、键盘/焦点、禁用/加载/错误状态、系统 reduced-motion 和 FIBA 主题一致性。仅修改依赖和配置时不得将“构建通过”表述为“所有页面已完成视觉验收”。
