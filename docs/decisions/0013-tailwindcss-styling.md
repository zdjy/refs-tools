# ADR 0013：前端样式采用 Tailwind CSS

- 状态：已接受
- 日期：2026-11-02
- 关联：[ADR 0006](0006-referee-web-frontend-stack.md)、[ADR 0007](0007-vue-ui-framework.md)

## 背景

现有 Vue 前端使用手写 CSS，旧样式规约明确禁止原子类框架。项目现在要求改用 Tailwind CSS，需要同时调整构建与规范，避免新增页面继续维护一套纯 CSS 布局方案。共享 FIBA UI 基线、Naive UI 基础组件和静态 SPA 部署方式保持不变。

## 决策

采用 **Tailwind CSS 4.x**，通过官方 `@tailwindcss/vite` 插件接入现有 Vite 构建。两个包仅作为实际使用它们的前端应用的开发依赖，不引入浏览器运行时、CDN、额外生产服务或第二套 PostCSS 管线。

采用 CSS-first 配置，以 `@theme inline` 将现有 `ui-tokens.ts` 注入的 CSS 变量映射为 Tailwind 语义工具类；不复制色值。重置默认颜色、断点、圆角和阴影命名空间，沿用项目既有取值，避免框架默认值成为另一套设计系统。Naive UI 继续负责基础交互组件和主题，Tailwind 负责应用布局及自有元素的呈现。

本次为基础接入，不批量迁移已有模板或删除旧样式。暂不引入 Preflight，保留既有 reset、触控尺寸、焦点及 reduced-motion 基线，降低全局重置影响 Naive UI 和旧页面的风险；后续是否启用须单独评估和回归。旧 CSS 仅作为迁移期兼容保留，新增与迁移代码的唯一规范入口为[样式规约](../agents/coding-standards/styles.md)。

## 备选方案

- **继续手写 CSS**：不增加构建依赖，但不符合本次明确的工程方向，页面布局与状态样式继续分散维护。
- **Tailwind CSS 3.4**：适合必须支持较旧浏览器的项目，但本次采用 4.x 的官方 Vite 集成与 CSS-first 配置，不另建旧版配置管线。
- **Tailwind CSS 4.x + PostCSS**：可行，但现有应用已经使用 Vite，专用插件无需再维护 PostCSS 配置及无关依赖。
- **一次性迁移全部样式并启用 Preflight**：能立即清理旧 CSS，但超出本次依赖与规范准备的范围，增加场边操作页回归风险。

## 后果

- 新增界面使用 Tailwind，存量页面逐组件迁移；基础接入完成不代表现有纯 CSS 已全部移除。
- 构建只扫描本应用源码与 HTML 入口，不扫描整个 Monorepo、第三方组件或文档；类名必须可被静态发现。
- 迁移期旧的未分层 CSS 与 Naive UI 样式仍有可能优先于分层工具类，不能依赖导入先后来强行覆盖；具体边界见样式规约。
- Tailwind 4.x 的浏览器基线为 Safari 16.4+、Chrome 111+、Firefox 128+；需要支持更旧浏览器时必须重新评估版本，不通过 Vite JS 转译假定 CSS 已兼容。部分前沿工具类仍需单独检查浏览器支持。
- 单测、类型检查和生产构建继续分离执行；构建检查需验证 token、断点、状态变体的工具类确实生成，并比较产物变化。依赖安装需保留构建阶段的原生可选依赖。

## 后续实施：存量界面迁移

在上述基础接入之后，按[迁移规格](../specs/0004-tailwind-migration.md)完成应用骨架、认证/账号、404 与工作台组件的迁移。前文“本次为基础接入”记录原决策阶段的范围，不再表示当前实现仍保留全部旧 CSS。未改变 token、断点、组件库、浏览器基线或静态部署方式，未启用 Preflight。

迁移发现未分层的全局 `a`、`button` 默认值会屏蔽工具类，因此将 reset、根排版与默认尺寸纳入现有 `base` 层；按压、可见焦点及 reduced-motion 继续保持未分层，以优先于组件库默认状态。Naive UI 根样式不强行分层，按钮尺寸差异集中通过公开主题接口适配，间距和选中背景移到自有外围 DOM；Modal preset 根宽度则经集中维护的公开 `style` 属性适配，避免库的 `width:100%` 吞掉移动端留白。相比 important 或内部选择器覆盖，这样保留了组件库交互与升级边界。

旧骨架、共享工具类和工作台样式文件已删除；认证页仅保留品牌折面的局部裁切，其他手写样式保留范围以样式规约为准。构建生成检查独立执行，视觉验收和体积记录维护在迁移规格中，不把验证脚本引入生产运行时。

## 参考

- [Tailwind CSS Vite 集成](https://tailwindcss.com/docs/installation/using-vite)
- [主题变量与 inline 映射](https://tailwindcss.com/docs/theme)
- [禁用 Preflight](https://tailwindcss.com/docs/preflight#disabling-preflight)
- [源码扫描](https://tailwindcss.com/docs/detecting-classes-in-source-files)
- [浏览器兼容性](https://tailwindcss.com/docs/compatibility)
