# 样式文件组织与存放

本文件属于[全栈架构与编码规约](../coding-standards.md)。

样式采用“**设计 token → 全局分层 → 页面私有样式**”的单一全局表结构：不启用原子类框架，不把业务类写进全局层，也不让页面样式回流到 `src/styles/`。`apps/referee-admin` 建立时使用同一结构。

## 1. 目录与文件职责

```
apps/referee-web/src/
├── ui-tokens.ts              # 设计 token 单一来源，运行时注入为 CSS 变量
├── ui-theme.ts               # Naive UI 主题映射，消费 ui-tokens
├── styles/
│   ├── index.css             # 唯一全局入口，只做 @import，不写规则
│   ├── base.css              # reset、根排版、控件基线、focus、reduced-motion
│   ├── layout.css            # 跨页面骨架：shell、topbar、侧栏容器、主内容区
│   └── utilities.css         # 确需跨页面复用的原子类（目前仅 .icon-button）
└── views/<feature>/
    ├── <feature>.css         # 本页面及私有子组件的全部业务类
    └── components/*.vue      # 仅在确需局部微调时使用 scoped 样式
```

| 文件 | 允许内容 | 禁止内容 | 行数上限 |
| --- | --- | --- | --- |
| `ui-tokens.ts` | 色值、字体、阴影、焦点环等 token 以及 CSS 变量注入 | 页面或组件专属的特例值；在 CSS 中重复定义同名变量 | 无硬性上限，按语义分组 |
| `styles/index.css` | `@import` 语句，顺序固定为 `base → layout → utilities` | 任何具体规则；导入页面样式 | 20 行 |
| `styles/base.css` | 全局 reset、根排版、`button`/`input` 基线尺寸、`:focus-visible`、`prefers-reduced-motion` | 布局骨架类；任何带业务含义的类名 | 150 行 |
| `styles/layout.css` | 应用骨架（`.app-shell`、`.topbar`、`.workspace`、侧栏与主内容容器）及其断点 | 页面或单个组件的内部类；业务状态类 | 200 行 |
| `styles/utilities.css` | 确需跨页面复用的单一职责原子类 | 引入原子类框架；堆叠式间距/排版工具类 | 100 行 |
| `views/<feature>/<feature>.css` | 该页面及其 `components/` 下组件的全部业务类、状态类、本页断点 | 全局 reset 或骨架类；跨页面共享的工具类 | 230 行（与 `.vue` 上限一致） |

## 2. 加载顺序与层叠优先级

* 唯一全局入口在应用入口文件（`src/main.ts`）中于根组件之前导入：`import './styles/index.css'`，确保全局层先于页面层写入。
* 页面样式由该页面的**根视图组件**导入（如 `WorkbenchView.vue` 导入 `./workbench.css`），不由 `main.ts` 或子组件导入，避免加载顺序依赖组件渲染顺序。
* 层叠优先级从高到低：Naive UI 主题覆盖 → CSS 变量 token → 页面样式 → `utilities` → `layout` → `base`。页面需要调整骨架默认值时优先覆盖页面内局部类，不改写全局层。
* 禁止 `!important`。唯一例外是 `base.css` 中为兼容系统 reduced-motion 偏好而覆盖第三方组件动效，且必须在规则上方说明原因；其余场景应通过降低选择器层级或使用主题接口解决。

## 3. `.vue` 内样式边界

* 默认不在 `.vue` 内写样式；页面样式写入同目录 `<feature>.css`。
* 仅在需要局部微调单组件且复用价值为零时，可在 `.vue` 内使用 `<style scoped>`，单块不超过 40 行，且不得重定义 token、主题值或页面主体布局。
* 禁止无 `scoped` 的 `<style>`；禁止在 `.vue` 中 `@import` 全局或页面样式文件；禁止用 `:deep()` 表达业务语义，组件库内部结构的适配统一收敛到主题配置或 `src/components/ui/`。
* 页面级状态（如 `clock-running`、`clock-expired`）由模板绑定类名表达，样式文件只声明外观；不在 JS 中拼接内联样式字符串，动态数值通过 CSS 变量传递。

## 4. 命名、断点与取值

* 类名使用 kebab-case 语义命名，取页面或业务词汇（如 `.clock-value`、`.session-item`），禁止 `.col-1`、`.mt-4`、`.card` 这类无语义泛名，避免跨页面冲突。
* 断点固定为 `375px`、`480px`、`768px`、`1100px`，一律 `min-width` 移动优先升序排列，同一断点的规则合并在同一个媒体查询块内；新增断点需在相关规格中说明理由。
* 颜色、阴影与焦点环只能来自 token 变量（`var(--red)`、`var(--line)`、`var(--shadow)`）；不得在页面样式或组件中写入十六进制/RGB 色值。新增颜色先加入 `ui-tokens.ts` 并同步 `ui-theme.ts`，不直接写进 CSS。
* 圆角目前取 12/16/24px 与胶囊 999px 四档，新增页面沿用现有档位，不引入第五种圆角；间距与字号可写数值，但同类元素应统一，不出现 13/14/15px 随机混用。
* 页面样式必须自带视觉状态（默认、hover、active、disabled、focus-visible），不得重置全局 `outline: none`，不得只靠颜色传达状态。
