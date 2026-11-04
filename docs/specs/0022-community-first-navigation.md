# FS-0022：社区优先的一级导航与移动端品牌入口

- 状态：已实现，验证记录见 §6。
- 适用应用：`apps/referee-web`。
- 业务依据：[FS-0006 首页与模块导航](0006-home-navigation.md)（模块路由、建设状态与身份投影规则的唯一来源）、[FS-0018 论坛为主的用户端首页](0018-forum-first-home.md)（社区页编排）、[MVP-001](0001-mvp-scope-and-business-rules.md)。
- UI 依据：[共享 UI 规范](../ui/macos_fiba.md)、[响应式规格](0005-responsive-layout.md)、[ADR 0029 品牌资源](../decisions/0029-brand-assets-and-app-icons.md)。
- 工程约束：遵循[统一编码规约](../agents/coding-standards.md)，不在本文重新定义依赖、分层、样式或文件长度规则。
- 关联改版：[FS-0019 移动底栏工具扇形菜单](0019-mobile-tools-fan-menu.md)（扇形行为不变，仅触发按钮外观改变）、[FS-0020 桌面账号菜单](0020-desktop-account-menu.md)（桌面仍不含「我的」）。

## 1. 背景与目标

原一级导航以「首页」为第一项，首页是论坛版式的社区内容，同时另有一条 `/forum` 建设说明页。两处都在表达社区，用户需要在「首页」和「社区」之间自己判断区别。本次改版：

1. 取消「首页」这一层概念：登录后进入的页面就是社区。
2. 一级导航按设备给出两套固定顺序，并在桌面端把「组织」提升为一级入口。
3. 移动底栏的「工具」改为项目方形品牌标，让场边最高频入口在视觉上独立出来。

本次只调整导航结构、路由落点与移动端工具位外观；社区页内容、工具扇形行为、工作台与各建设说明页均不变。

## 2. 导航结构

| 位置 | 顺序 | 目标 |
| --- | --- | --- |
| 桌面主导航（≥ `tablet`） | 社区、学习、组织、工具 | `/`、`/learning`、`/organizations`、`/tools` |
| 移动底栏（< `tablet`） | 社区、学习、工具、组织、我的 | `/`、`/learning`、工具扇形、`/organizations`、`/account` |

- 两套顺序不同，因此分别声明 `desktopNavigation` 与 `primaryNavigation`，不再由同一数组过滤得出；顺序固定，不按使用频率或登录状态排序。
- 桌面端继续不显示「我的」：账号入口由顶栏用户名菜单承担（FS-0020）。
- 「组织」进入一级导航后，账号菜单中的「我的组织」保持不动：前者是栏目入口，后者是账号相关跳转，指向同一路径不构成两套语义。
- 当前页使用 `aria-current="page"`，栏目下的子页面使用 `aria-current="location"`；`/organizations` 归入「组织」栏目，`/read/*` 的讨论文章归入「社区」栏目。

## 3. 路由合同

| 路径 | route name | 变化 |
| --- | --- | --- |
| `/` | `community` | 由 `home` 改为 `community`，标题由「首页」改为「社区」，仍渲染论坛版式社区页 |
| `/forum` | — | 下线，与未知路径一样匹配 404；不保留重定向 |
| `/organizations` | `organizations` | 新增导航归属 `organizations`，页面形态仍为建设说明 |

- 路由仍为显式静态声明与懒加载，不按角色动态注入，不为已下线路径保留别名。
- 登录成功后进入 `/`；注册成功后仍进入 `/account` 完成首次密码设置（[ADR 0012](../decisions/0012-initial-password-after-email-verification.md)）。这是对 FS-0006「不修改登录后跳转」与 FS-0020「不改变登录落点」两处表述的定向修订。
- 站内指向社区的链接（阅读页返回、建设说明页返回、社区侧栏）统一使用 `/`，文案改为「返回社区」「回到社区讨论」，不再出现「返回首页」或「查看社区建设状态」。

## 4. 移动底栏「工具」位

1. 该位置显示项目方形品牌标（`src/assets/brand/mark-light.png`，由 `pnpm brand:icons` 从 `logo/` 母版生成，透明底），不显示「工具」文字。
2. 其余四项仍为「图标 + 文字」；工具位是唯一没有可见文字的一级入口，因此可访问名称由 `aria-label="工具"` 提供，图片本身 `alt=""` 且对辅助技术隐藏。
3. 工具位仍是按钮，行为与 FS-0019 一致：点击/键盘展开扇形，`aria-expanded`、`aria-controls` 指向扇形，`aria-current` 在工具页高亮；按钮不直接跳转。
4. 未激活时按钮为透明底、无边框（项目未引入 Preflight，按钮默认边框与底色必须显式清除）；激活时沿用沙金底与 `shadow-selected`，与其他四项一致。
5. 品牌标按 `size-7`（28px）等比显示，触控目标仍不小于 44×44 CSS px。

## 5. 视觉与可访问性

- 沿用共享 UI 基线的暖白画布、沙金激活底、球场红图标与 200ms `ease-out` 过渡，不引入新的配色、渐变或发光。
- 移动底栏仍为五等分网格，工具位不因去掉文字而改变其他四项的宽度与间距；页面无横向溢出。
- 桌面主导航四项均为文字链接，激活态同时由底色、字重与圆点指示，不只依赖颜色。
- 底栏高度、安全区 padding 与内容底部留白不变。

## 6. 验收与验证记录

验收标准：

1. 桌面主导航恰为社区、学习、组织、工具，移动底栏恰为社区、学习、工具、组织、我的；`/` 在两者中均为当前页。
2. `/forum` 返回 404；`/` 的 route name 为 `community`，标题为「社区 | 裁判工具箱」。
3. 移动底栏工具位渲染方形品牌标且无文字，`aria-label` 为「工具」，扇形仍能展开并定位在该按钮上方。
4. 登录成功进入 `/`，注册成功进入 `/account`。
5. `pnpm test`、`typecheck`、生产构建、`test:styles` 通过，产物体积变化可解释。

自动化：

- 全仓库低内存单测 73 文件、371 项通过（Node 堆上限 192 MiB）。`router.test.ts` 断言根路径为 `community`、`/forum` 为 404、两套导航顺序与标题、`/organizations` 的栏目归属；`editorial.test.ts` 断言讨论文章归入「community」；`community-presentation.test.ts` 覆盖改名后的社区展示与筛选。
- `typecheck`、生产构建与 `test:styles` 未能完整执行：工作区存在与本次改动无关的进行中改动（`src/views/profile/*`、`src/features/account/*`、`src/api/http/platform-client.ts`）导致 `vue-tsc` 与 `vite build` 报错。本次改动的 15 个 SFC 单独用 `@vue/compiler-sfc` 编译通过；相关单测全部通过。以上检查需在该改动完成后重跑。

浏览器（Chrome CSS viewport，本地 HTTPS 开发入口）：

- 390×844：底栏顺序为社区/学习/工具/组织/我的，工具位为 28px 方形标（`naturalWidth` 128），按钮 73×56 CSS px，无文字；点击后扇形照常展开、定位在工具位上方；Escape 收起。
- 1280×900：主导航为社区/学习/组织/工具，移动底栏 `display: none`，页面无横向溢出。
- `/` 标题为「社区 | 裁判工具箱」，社区页内不再存在任何 `/forum` 链接；侧栏「社区当前状态」改为中性说明。
- `/forum` 显示 404 页面；`/organizations` 显示「我的组织」建设说明且「组织」为 `aria-current="page"`，返回链接文案为「返回社区」。
- `/read/contact-review`：主导航「社区」为 `aria-current="location"`，正文上下两个返回链接均指向 `/`。
- `/login` 页面正常渲染；接口返回 502（本地仅启动前端），因此登录/注册真实落点未做浏览器验证，按代码路径与单测确认。

未验证项：真实账号登录/注册落点、真机与移动浏览器、屏幕阅读器、`prefers-reduced-motion` 实测（沿用既有全局压制规则）。
