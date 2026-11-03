# ADR 0017：直接采用 Naive UI Admin 作为管理端模板

- 状态：已接受选型，源码迁移已实施；真实授权验收待补
- 调研日期：2026-11-03
- 关联：[FS-0007](../specs/0007-admin-console.md)、[迁移 ticket 07](../../.scratch/admin-console/issues/07-adopt-naive-ui-admin.md)
- 替代范围：替代 [ADR 0016](0016-admin-web-foundation.md) 中“不新增后台模板、只参考交互、不复制源码”的决定；其静态部署、真实业务渐进接入、会话与安全边界继续有效。

## 1. 背景与结论

需求方明确要求：**管理端直接改用现成模板，不再自行开发后台基础框架**。现有 `apps/admin-web` 虽已实现登录、应用壳和审计查询，但自研应用壳不是新的实施方向。

选择 [jekip/naive-ui-admin](https://github.com/jekip/naive-ui-admin) 的 **MIT 开源版 v3.0.0**，将其源码作为 `apps/admin-web` 的后台基座，而不是仅参考截图或重新仿写。

- 固定 tag：[`v3.0.0`](https://github.com/jekip/naive-ui-admin/tree/v3.0.0)。
- 固定 commit：[`c9db4cde447240eaa17fbe439f507680819add3d`](https://github.com/jekip/naive-ui-admin/commit/c9db4cde447240eaa17fbe439f507680819add3d)。
- 开源版预览：<https://gratis.naiveadmin.com>。
- 开源版文档：<https://docs.naiveadmin.com>。
- 不购买、混用或依赖 Max / Next 等独立商业产品的功能。

本 ADR 原始交付是调研和选型。后续 ticket 07 已直接迁入固定源码并替换管理端应用壳，来源与裁剪见[第三方说明](../../apps/admin-web/third-party/naive-ui-admin/README.md)，本项目实测结果与未执行项见[迁移验收记录](../specs/0007-admin-template-acceptance.md)。不因源码接入完成而宣称真实授权链路通过。

## 2. GitHub 搜索范围与证据等级

通过 GitHub Repository Search API 按 stars 降序检索，每组读取前 30 条：

| 查询 | 搜索报告的总匹配数 |
| --- | ---: |
| `vue admin template stars:>100` | 95 |
| `vue naive admin` | 153 |
| `vue3 admin dashboard stars:>100` | 17 |
| `admin dashboard tailwind vue stars:>100` | 11 |
| `react admin dashboard template stars:>1000` | 13 |
| `bootstrap admin dashboard template stars:>1000` | 20 |

共获得 **107 个去重仓库条目**，其中有无关结果、后端配套项目和重复生态，不能称为 107 个可用前端模板。整理下表 **36 个相关候选/方案**，其中 **13 个**进一步读取 README、`package.json` 与 `LICENSE`。首选还检出了固定 tag 的源码，核查布局、权限路由、持久化与生产 Mock 配置。

证据等级：

- **源码**：固定版本源码、说明、依赖和许可证均已查看；不是完整安全审计。
- **文档**：README、依赖清单与许可证已读取；未逐页运行或验收。
- **初筛**：仅核对搜索元数据中的说明、许可证标识和维护时间，不声称已验证全部功能。

Stars、推送时间和包版本均为调研快照。`pushed_at` 不等于最新人工维护日期，也不能证明没有漏洞。额外查询 Vben、Pure Admin 等仓库元数据时遇到 GitHub API 匿名限流，改读 GitHub raw 文件；没有补造这些仓库的 stars 或维护日期。

### 2.1 Naive UI / 同栈候选

| # | 仓库 | 证据 | 主要取舍 |
| --- | --- | --- | --- |
| 1 | [Naive UI Admin](https://github.com/jekip/naive-ui-admin) | 源码 | **采用**：Vue 3 + TS + Naive UI + Tailwind；需替换演示认证并升级样式接入 |
| 2 | [SoybeanAdmin](https://github.com/soybeanjs/soybean-admin) | 文档 | 能力丰富；UnoCSS、自动文件路由和内部 workspace 包接入较多，且上游正在转向新框架 |
| 3 | [Vue Naive Admin](https://github.com/zclzone/vue-naive-admin) | 文档 | 简洁但前端明确使用 JavaScript；后端菜单、Token、UnoCSS 需较多调整 |
| 4 | [Nova Admin](https://github.com/chansee97/nova-admin) | 文档 | Vue + TS + Naive；引入 UnoCSS、pro-naive-ui、持久化插件，当前适配收益不及首选 |
| 5 | [Robot Admin](https://github.com/ChenyCHENYU/Robot_Admin) | 文档 | 企业功能充分；Bun、独立生态包、多公司上下文和较多工程机制超出本项目需要 |
| 6 | [Vue Vben Admin](https://github.com/vbenjs/vue-vben-admin) | 文档 | 有 Naive 应用和 Tailwind；多应用、内部包、Turbo 等完整平台移植成本较高 |
| 7 | [naiveui-admin-template](https://github.com/sohaha/naiveui-admin-template) | 初筛 | 同组件栈；元数据显示最后推送于 2023 年，不优先用于新基座 |
| 8 | [vite-naive-template](https://github.com/pdsuwwz/vite-naive-template) | 初筛 | 候选说明为 TSX + UnoCSS 原型框架，与现有 SFC 工作方式匹配度较低 |
| 9 | [Panis Admin](https://github.com/paynezhuang/panis-admin) | 初筛 | Soybean 二次修改且有配套后端取向；不比直接采用上游更节省适配 |
| 10 | [Vue FastAPI Admin](https://github.com/mizhexiaoxiao/vue-fastapi-admin) | 初筛 | 全栈方案；已有 API，不为后台界面另换后端 |
| 11 | [FastSoyAdmin](https://github.com/sleep1223/fast-soy-admin) | 初筛 | FastAPI + Soybean 组合；同样不引入第二套后端 |

### 2.2 其他 Vue 候选

| # | 仓库 | 证据 | 主要取舍 |
| --- | --- | --- | --- |
| 12 | [v3-admin-vite](https://github.com/un-pany/v3-admin-vite) | 文档 | 成熟、结构相对直接；Element Plus + UnoCSS，不延续现有 Naive UI |
| 13 | [vue-pure-admin](https://github.com/pure-admin/vue-pure-admin) | 文档 | TS + Tailwind，但为 Element Plus；完整版示例/依赖很多 |
| 14 | [Art Design Pro](https://github.com/Daymychen/art-design-pro) | 初筛 | Vue + TS；元数据指向 Element Plus，组件栈不匹配 |
| 15 | [Shadcn Vue Admin](https://github.com/Whbbit1999/shadcn-vue-admin) | 文档 | TS + Tailwind 4，注重响应式；引入另一套 UI/表格/表单体系及默认持久化机制 |
| 16 | [TailAdmin Vue](https://github.com/TailAdmin/vue-tailwind-admin-dashboard) | 文档 | TS + Tailwind 4、现成布局丰富；不是 Naive UI，图表/日历与免费/Pro 边界需另审 |
| 17 | [Admin One Vue Tailwind](https://github.com/justboil/admin-one-vue-tailwind) | 文档 | Tailwind 4、结构轻；当前 Vue 模板为 JS，不含现有 Naive UI 组件体系 |
| 18 | [Vuestic Admin](https://github.com/epicmaxco/vuestic-admin) | 文档 | Vue + Tailwind、页面齐全；依赖 Vuestic UI，会更换组件体系 |
| 19 | [Fantastic Admin Basic](https://github.com/fantastic-admin/basic) | 文档 | 功能和主题能力完整；当前为多包工程和 UnoCSS，接入面大于首选 |
| 20 | [CoreUI Vue Free](https://github.com/coreui/coreui-free-vue-admin-template) | 初筛 | 可用成熟基座；引入 CoreUI / Bootstrap 另一套表现层 |
| 21 | [Materio Vuetify Free](https://github.com/themeselection/materio-vuetify-vuejs-admin-template-free) | 初筛 | Vuetify/Material 风格，与已有组件栈及 FIBA 风格距离较大 |
| 22 | [Quasar Admin](https://github.com/pratik227/quasar-admin) | 初筛 | 需要 Quasar 框架，不为模板改变整个应用构建方向 |
| 23 | [Vben Admin Thin Next](https://github.com/vbenjs/vben-admin-thin-next) | 初筛 | 仓库说明为 Vben 2.x 精简版，不将旧主线精简版当作当前 5.x |
| 24 | [vue-admin-template](https://github.com/PanJiaChen/vue-admin-template) | 初筛 | 高 stars，但明确为 Vue 2，不采用 |
| 25 | [iView Admin](https://github.com/iview/iview-admin) | 初筛 | Vue 2，元数据显示最后推送于 2022 年，不采用 |
| 26 | [Vue Antd Admin](https://github.com/iczer/vue-antd-admin) | 初筛 | Ant Design Vue 路线；非 Naive UI，不优于同栈候选 |

### 2.3 HTML / Bootstrap / React 对照候选

以下用于避免只在同一生态内挑选；不因 stars 更高就付出框架重写成本。

| # | 仓库 | 证据 | 主要取舍 |
| --- | --- | --- | --- |
| 27 | [AdminLTE](https://github.com/ColorlibHQ/AdminLTE) | 初筛 | 成熟 Bootstrap 模板；Vue 业务适配及组件体系调整更大 |
| 28 | [Gentelella](https://github.com/ColorlibHQ/gentelella) | 初筛 | 当前描述为 vanilla JS / SCSS / Vite，不是 Vue + Naive 基座 |
| 29 | [CoreUI Bootstrap Free](https://github.com/coreui/coreui-free-bootstrap-admin-template) | 初筛 | HTML / Bootstrap 路线，不优于其 Vue 版，更不优于现有同栈方案 |
| 30 | [Mazer](https://github.com/zuramai/mazer) | 初筛 | Bootstrap 5，适合 HTML 后台，但与当前 Vue 应用适配较多 |
| 31 | [AdminKit](https://github.com/adminkit/adminkit) | 初筛 | HTML / Bootstrap 5，存在相同组件栈转换成本 |
| 32 | [Volt Bootstrap 5](https://github.com/themesberg/volt-bootstrap-5-dashboard) | 初筛 | Bootstrap + vanilla JS，元数据显示最后推送于 2023 年 |
| 33 | [Sneat Bootstrap Free](https://github.com/themeselection/sneat-bootstrap-html-admin-template-free) | 初筛 | 现成页面丰富，但为 HTML / Bootstrap 路线 |
| 34 | [CoreUI React Free](https://github.com/coreui/coreui-free-react-admin-template) | 初筛 | 会引入 React，与现有 Vue 逻辑和主题不匹配 |
| 35 | [Material Kit React](https://github.com/devias-io/material-kit-react) | 初筛 | React + Material UI，不能直接复用现有 Vue 表现层 |
| 36 | [Horizon UI Chakra](https://github.com/horizon-ui/horizon-ui-chakra) | 初筛 | React + Chakra，且默认视觉与项目基线差异较大 |

## 3. 最终取舍依据

### 3.1 为什么选择 Naive UI Admin

1. **基础栈最接近**：固定版本使用 Vue `^3.5.44`、Naive UI `^2.45.3`、TypeScript、Vite 和 Pinia；Vue 与 Naive UI 的声明版本与现有管理端相同。
2. **无需更换样式框架种类**：上游已经使用 Tailwind，而非 UnoCSS；但上游为 Tailwind 3.4，必须适配本项目的 Tailwind 4 接入，不能声称零改造。
3. **直接有可用后台基座**：源码已有 layout、Header、Menu、Main、TagsView、移动端 Drawer，以及表单、表格、Modal、403/404/500 等可复用内容。不会再次从零建设壳层。
4. **可切断演示后端耦合**：有前端固定菜单模式，不要求必须部署其配套后端。但该模式仍过滤 permissions、动态注入路由，不能简单切到 `FIXED` 就当作符合本项目静态路由约束。
5. **许可明确**：固定版本 LICENSE 为 MIT，允许商用及修改，须保留版权与许可；开源版与商业版相互独立。
6. **维护信号可核对**：搜索快照为 5,933 stars、未归档、最后推送 2026-10-21；tag 对应提交日期同为 2026-10-21。作为辅助信号，不作为质量保证。

### 3.2 为什么不选另外几款强候选

- **SoybeanAdmin**：搜索快照 15,247 stars，同组件栈、移动端和主题能力好；但当前 README 明确提示 2.3 为 2.x 最后一个维护大版本，3.0 将基于 ubean 与 VeanUI 整体重构。为现有 Naive UI 项目选新基座时，跨主线维护风险加上 UnoCSS/自动路由适配成本不占优。依据见[上游 README](https://github.com/soybeanjs/soybean-admin/blob/d2dfefd757e37d8d6077ea1cea6181fb628d6097/README.md)。
- **Vue Naive Admin**：搜索快照 3,985 stars，极简风格合适，但 README 明确前端不用 TypeScript；将 JS 主线转成当前严格 TS 业务底座并不比首选省事。
- **Vben 5**：支持 Naive UI 与 Tailwind，值得作为大型后台候选；但当前是多应用/内部包平台。不是认为 Monorepo 或构建 heap 配置会增加生产内存，而是本项目已有自己的 Monorepo，不需要再迁入一套平台工具链。
- **Shadcn Vue Admin / TailAdmin Vue**：Tailwind 4 匹配度高，但需要更换表现层组件体系；后者还需单独核查所保留图表/日历依赖的许可，主仓库 MIT 不能代替依赖许可检查。

## 4. 直接采用的边界

### 4.1 必须保留的上游能力

- 以固定版本为来源，将布局、桌面侧栏、移动菜单、顶栏、面包屑和主内容容器直接迁入 `apps/admin-web`，替换现有自研应用壳。不只摘取一个按钮或复制视觉后继续自建布局。
- 表单、表格、Modal、结果和异常页优先使用模板现成组件/页面，按实际业务保留；审计为只读游标查询，不强行套入模板的页码 CRUD。
- 多页签按需配置；首批关闭页面缓存，避免私有审计数据随标签保留。不是为了保留模板功能而启用全部演示特性。
- 品牌、菜单内容和集中主题适配共享 FIBA 规格；不重新设计另一套后台基础视觉。既有登录、审计 API adapter、会话/查询状态及测试优先迁移保留，不因换模板重写业务规则。
- 接入时保留上游 MIT LICENSE，记录来源、tag、commit、保留路径和本地改动，建立可追踪的第三方声明。只保留实际使用的代码，不将完整演示站作为生产后台发布。

### 4.2 必须移除或适配的默认机制

| 固定版本中的事实 | 本项目接入要求 |
| --- | --- |
| `.env.production` 默认开启 Mock；含演示统计与模拟登录 | 正式构建禁用并剔除 Mock、演示账户、假业务数据，不允许请求失败回填模拟成功 |
| `store/modules/user.ts` 将 Token/用户写入 storage；守卫读取 ACCESS_TOKEN | 替换为现有同源 HttpOnly Cookie 会话及内存投影，不持久化认证凭据和私有记录 |
| `FIXED` 模式仍根据 permissions 过滤并生成路由 | 保留模板导航呈现，使用本项目显式静态路由；不新增后端菜单和权限探测接口 |
| 上游为 Pinia 2、Router 4、Vite 7、TS 5.9、Tailwind 3.4 | 在现有 workspace 版本上做兼容验证；不默认降级全仓依赖，也不并行安装两套样式管线 |
| 布局含 Less、硬编码颜色和超过本项目长度上限的 SFC | 迁入时按统一规约做机械拆分、集中 token/样式适配，不以模板来源静默豁免规约，不重写布局交互 |
| 默认主题及按钮形状不等于 FIBA，移动端 Drawer 不等于完成可访问性验收 | 集中主题适配后验证触控、焦点约束/恢复、reduced-motion、长内容及窄屏 |
| 模板包含图表、富文本、上传等示例与依赖 | 仅保留业务确需部分；媒体继续按现有直传方案，模板上传示例不能改成 API 中转媒体 |

安全、契约、工程分层和样式的统一要求继续以[编码规约](../agents/coding-standards.md)为唯一维护入口，本 ADR 不另建模板专属规约。若实际接入发现确需例外，须先明确范围和理由，而不是默许照搬上游默认值。

## 5. 实施顺序与验收门槛

1. 保留迁移前业务测试和构建体积基线；建立来源/许可记录，导入固定版本的实际使用代码。
2. 用模板布局替换自研壳，接入现有菜单及登录/会话/审计流程，关闭无业务接口的演示功能。
3. 完成依赖兼容、Tailwind 4 与集中 FIBA 主题适配，不影响裁判端及 API。
4. 执行 FS-0007 的会话、审计、失效响应、离线失败和权限验收；补充无 Mock/Token 持久化与模板来源检查。
5. 生产构建仍为 Nginx `/admin/` 静态资源，无新增生产前端服务或模板配套后端；报告体积差异及浏览器回归结果。

详细验收由 FS-0007 与 ticket 07 维护。本 ADR 的接受不代表这些检查已通过。

## 6. 已验证与限制

- 已完成六组 GitHub 搜索、36 项初筛与 13 项文档/依赖/许可证核查；首选已检出固定 tag，并查看布局、权限路由、Token 存储、生产环境和 LICENSE 源文件。
- 已确认公开演示站可加载登录页；使用其公开预填演示账户尝试登录后未进入工作台，因此**不宣称已完成在线工作台或移动端交互验收**。选型主要依据可复查的固定版本源码与文件，不依据商业版演示功能。
- 未安装或运行第三方依赖，未执行上游构建、完整漏洞/供应链审计、低内存单测和生产性能测试。上游 README 提供的 gzip 体积仅为上游口径，不作为本项目产物指标。
- 以上为选型阶段历史证据；后续 ticket 07 已实施源码迁移，详见[迁移验收记录](../specs/0007-admin-template-acceptance.md)。旧自研壳的测试/截图/构建结果不能作为新模板迁移已完成的证明。

## 7. 可复查的首选源码

所有链接固定于同一 commit：

- [README（开源/商业边界、生产 Mock、构建说明）](https://github.com/jekip/naive-ui-admin/blob/c9db4cde447240eaa17fbe439f507680819add3d/README.md)
- [package.json（真实依赖版本）](https://github.com/jekip/naive-ui-admin/blob/c9db4cde447240eaa17fbe439f507680819add3d/package.json)
- [LICENSE](https://github.com/jekip/naive-ui-admin/blob/c9db4cde447240eaa17fbe439f507680819add3d/LICENSE)
- [layout/index.vue（模板布局与移动 Drawer）](https://github.com/jekip/naive-ui-admin/blob/c9db4cde447240eaa17fbe439f507680819add3d/src/layout/index.vue)
- [asyncRoute.ts（固定/后端菜单模式仍有权限过滤）](https://github.com/jekip/naive-ui-admin/blob/c9db4cde447240eaa17fbe439f507680819add3d/src/store/modules/asyncRoute.ts)
- [user.ts（需要替换的演示认证和持久化）](https://github.com/jekip/naive-ui-admin/blob/c9db4cde447240eaa17fbe439f507680819add3d/src/store/modules/user.ts)
- [.env.production（默认启用 Mock）](https://github.com/jekip/naive-ui-admin/blob/c9db4cde447240eaa17fbe439f507680819add3d/.env.production)
