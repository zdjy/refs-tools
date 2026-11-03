# FS-0007 / ticket 07：Naive UI Admin 源码迁移验收记录

- 日期：2026-11-03。
- 状态：源码迁移及本地自动/浏览器验收已执行；真实授权账号链路未执行，不能视为全部业务验收完成。
- 需求：[FS-0007](0007-admin-console.md)、[ticket 07](../../.scratch/admin-console/issues/07-adopt-naive-ui-admin.md)。
- 决策：[ADR 0017](../decisions/0017-admin-template-selection.md)。
- 来源、保留路径与逐模块修改：[第三方来源说明](../../apps/admin-web/third-party/naive-ui-admin/README.md)；固定原始 Git blob / SHA-256：[source.json](../../apps/admin-web/third-party/naive-ui-admin/source.json)。

## 1. 实施结果与边界

直接从 `jekip/naive-ui-admin` MIT 开源版 `v3.0.0` / `c9db4cde447240eaa17fbe439f507680819add3d` 复制 layout、Header、Menu、Main、Logo 与 404，再裁剪演示机制、迁移样式和拆分状态。根组件实际装配模板 `src/layout/index.vue`，原自研壳与导航文件已删除；使用模板的 Naive Layout、Sider、移动左侧 Drawer、NMenu、面包屑和 keyed RouterView，不是仅取一个组件后保留旧壳。

- Cookie 会话、登录/审计 API、会话状态、审计游标/失效响应处理及既有业务测试保持不变；本次没有改变 contracts、domain、API、数据库或授权引擎。
- 原子 CSS 接入沿用 Tailwind 4，模板 Less/Tailwind 3 配置未迁入；FIBA 适配通过本应用 `ui-theme.ts` 和既有 token，不跨应用导入、不增加主题体系。
- 只使用静态路由投影菜单。演示认证、Mock、动态权限菜单、Token/私有记录持久化、TagsView/KeepAlive、假统计、配置器、图表/富文本/上传演示及对应依赖均未导入。
- 复用 workspace 现有版本，没有新增依赖，不修改 `pnpm-lock.yaml`；初始及任务期间其他前端/依赖/文档改动保留，未回滚裁判端并行工作。
- 保留原有业务表单和手机审计卡片；BasicForm/BasicTable 的动态全局组件/页码 CRUD 不适合当前协议，BasicModal 无实际写用例，具体取舍见来源说明，不强行引入通用封装。

## 2. 自动检查

在仓库根目录执行：

```sh
pnpm --filter @refs-tools/admin-web test
pnpm --filter @refs-tools/admin-web typecheck
pnpm --filter @refs-tools/admin-web build
pnpm --filter @refs-tools/admin-web test:styles
pnpm --filter @refs-tools/admin-web test:template --upstream=../../.cache/admin-template-research/naive-ui-admin-source
pnpm test
```

| 检查 | 结果 |
| --- | --- |
| 管理端单测 | 6 文件、28 项通过；原 24 项业务测试保留，增加 3 项布局生命周期/焦点编排及 1 项静态菜单投影测试 |
| 全仓快测 | 39 文件、211 项通过；包括工作区并行任务已有测试，不含独立数据库集成测试 |
| 低内存管理端单测 | Docker 限制 300 MB，V8 heap 192 MB，28 项通过；最终轮 cgroup `memory.peak=131231744` bytes（约 125.2 MiB）；较早轮亦低于限制 |
| 类型与构建 | `typecheck` 及生产构建通过；Vue 3.5.44 / Naive UI 2.45.3 / Pinia 4.1.0 / Router 5.4.0 / Vite 8.3.5 / TS 5.9.3 兼容 |
| 样式生成 | 八档断点、语义 token、状态/任意值工具类、扫描边界通过；无 Tailwind 默认调色板/Preflight 混入 |
| 模板核查 | 固定 commit、原始 7 项 blob / SHA-256、MIT 原文和产物副本、实际组件装配、SFC 行数、安全裁剪检查通过 |
| 第三方声明 | Vite 输出 20 项实际 bundle 依赖许可元数据；声明为 MIT / Apache-2.0，模板原始 MIT 全文单独分发；下文明确正文缺口，不宣称完整供应链审计 |
| diff 空白检查 | `git diff --check` 通过 |

单测通过边界替身验证真实 API adapter 的请求编码和 Cookie/no-store 参数，不代表访问了真实管理员数据。新增布局测试使用无 DOM Vue renderer，不把组件库内部行为拉进低内存单测；真实焦点约束另做浏览器检查。

## 3. 本项目产物体积对照

迁移前现场重建的静态产物已保存于忽略目录 `.cache/admin-template-migration/baseline/`；没有引用上游演示站数字。以下为所有 JS chunk（含懒加载）之和，gzip 使用同一 Node `zlib.gzipSync` 单文件压缩后求和；不是仅对比入口文件，也不是首屏下载量。

| 产物 | 迁移前 bytes | 迁移后 bytes | 差异 |
| --- | ---: | ---: | ---: |
| JS，原始合计 | 337,863（7 块） | 439,817（8 块） | +101,954，约 +30.2% |
| JS，gzip 合计 | 117,870 | 144,271 | +26,401，约 +22.4% |
| CSS，原始 | 9,652 | 9,515 | -137，约 -1.4% |
| CSS，gzip | 2,618 | 2,662 | +44 |

增加来自模板 NMenu / Layout / Sider / Drawer / Breadcrumb 的组件能力，未增加依赖、图表或生产服务。Vite 输出入口约 305.42 kB，另拆 runtime-core 68.55 kB；不把入口拆块当成体积下降。额外静态许可文件约 1.10 kB（模板）及 30.98 kB（依赖元数据），不在 JS/CSS 合计中，也不参与首屏自动请求。

## 4. 浏览器验收

### 4.1 独立 API 替身，非真实授权验收

使用本次构建 `dist` 和仅位于忽略目录的独立验收服务（`127.0.0.1:5187`）。替身不进入源码、生产构建或 Nginx 镜像；未使用上游在线演示。检查结果及过程脚本保存在 `.cache/admin-template-migration/`，不把临时脚本作为生产运行组件。

- 登录页与带长 UUID/长理由的审计页均验证 320、375、768、1100、1440px；无页面级横向溢出。按钮/输入/select/导航链接均至少 44×44px。
- 320px 登录必填错误有字段关联、`aria-invalid` 和首个错误字段焦点；桌面错误密码持久显示错误且保留输入，正确登录后才进入审计。
- 桌面审计与 320px Drawer 完成截图视觉复核：沙金侧栏、暖白画布、白色内容区、炭黑主按钮和球场红当前项，按钮为胶囊。截图仅为替身数据。
- 移动 Drawer 有可访问名称、`aria-modal=true`；Tab / Shift+Tab 约束在菜单内，Escape 关闭，焦点恢复 `admin-menu-trigger`。菜单导航后关闭弹层、焦点定位 `admin-main`，旧审计视图销毁。
- 667×375 横屏 Drawer 不超视口，内部可滚动到关闭菜单按钮；桌面可收为 64px 并重新展开，折叠项仍有名称/导航。
- 当前路由链接带 `aria-current=page`；键盘焦点实际呈可见红色实线；有跳至主内容链接。模拟系统 reduced-motion 后 Drawer 实际过渡时长为 `0.00001s`。
- 下一页使用真实 adapter 接收的游标，末页按钮禁用；成功空数组、403、503、加载、重试均有相应文案，不保留失败前列表、不展示假计数。
- 退出失败保留当前会话和受保护视图，持久提示重试；401 后立刻销毁受保护列表/导航并显示登录。成功退出亦返回登录且无审计残留。
- 模拟浏览器断网后，读取失败清空旧列表并显示“连接失败”及重试；恢复网络后显式重试成功，不显示离线成功或陈旧记录。
- 本源 `localStorage`、`sessionStorage`、IndexedDB 数据库、CacheStorage 均为空，Service Worker 注册数为 0。
- `/admin/audit` 刷新可恢复替身会话并读取列表；未知深链接使用迁入的 404；未登录加载仅请求 session，不提前发私有业务查询。

### 4.2 Nginx 与真实 API 匿名边界

构建独立镜像 `refs-tools-admin-template-web:local`（Docker `--target web`）通过，并启动独立临时容器、使用本地现有 API 网络及证书，于 8446 端口验收；未替换原运行中服务，验收后移除临时容器。

- `nginx -t` 通过；`/admin` 相对 302 到 `/admin/`；`/admin/audit` 入口 200/no-cache；缺失指纹 JS 为 404；实际 CSS 为一年 immutable；模板许可 URL 200。
- 浏览器接受仅用于本地验收的自签证书警告后，在真实 Nginx `/admin/audit` 展示登录页；实际仅发 `/api/v1/auth/session`。无本源持久凭据，Service Worker 为 0。
- 真实 API 匿名 session / audit 均为 401，未绕过 API 授权。**没有授权测试账号，因此未执行真实密码登录、Cookie 恢复/退出、授权审计读取与查询审计数据库写入一致性的端到端检查。**

## 5. 未完成项与限制

1. 受控 HTTPS 环境中的授权测试账号链路仍需补验；不创建/提升管理员，不使用猜测凭据，也不把替身结果写为真实通过。ticket 保持“已实施，待真实授权验收”。
2. 未重跑独立 PostgreSQL 集成测试；本次未改后端、SQL、数据库迁移或授权策略。没有宣称真实实时撤权/同事务审计通过。
3. 既有传递依赖中 css-render 三包与 vdirs 的 npm 发布未附 LICENSE，Vite 仅能生成 MIT 声明，不能替代完整正文审计。模板自身 MIT 原文、版权与生产副本完整；无新运行时依赖。详情见来源说明的许可边界。
4. 未执行完整屏幕阅读器人工验收、暗色主题或全部业务后端验收；组织/认证/内容考试/阅卷/社区治理仍待 ticket 04–06，不因换模板变为已完成。

## 6. 规约逐项自检

| 自检项（顺序对应 workflow 清单） | 结果 |
| --- | --- |
| SQL 归属 | 不适用，未改后端 |
| Repository / 事务端口无驱动泄漏 | 不适用，未改后端 |
| 同连接事务 / 回滚 / outbox | 不适用，未改事务 |
| 表所有者 / 约束 / 并发 / 迁移及 PostgreSQL 检查 | 不适用，未改持久化；数据库端到端限制如上 |
| Vue 文件长度 | 通过，所有 SFC ≤230 行 |
| HTTP 分离 | 通过，API 仅在既有 api 层 |
| 跨端契约 | 通过，沿用既有 auth/audit contracts，无复制 DTO |
| 新 domain/service 测试 | 不适用，无新增；新增布局状态/菜单有测试 |
| 授权引擎边界 | 未修改引擎或后端；无角色缓存、探测和客户端放行 |
| Naive UI 表现层边界 | 通过，业务 Composable/API/状态仍不引用 UI 库 |
| 组件归属/封装 | 通过，模板布局属本应用，不跨页面/应用导入，不引入泛化 CRUD |
| 集中主题 | 通过，公开主题接口集中适配，无全量注册/深层覆盖 |
| 表单/异步/离线/确认 | 保留且回归错误/加载/重试，断网不成功；无破坏性业务用例 |
| 状态分层/Pinia | 会话保持内存状态；布局界面状态局部拥有，无持久化 |
| Router 边界 | 静态 URL，仅表现组件导航，业务状态不依赖 Router |
| 移动/键盘/主题/构建 | 已执行上述浏览器及自动检查；授权/屏幕阅读器限制如上 |
| 注释意图 | 新增中文意图说明，无注释掉代码或无主 TODO |
| 规则依据/单位 | 不新增领域函数、DTO 字段或 SQL，不适用 |
| Tailwind 迁移 | 上游 Less/手写布局转 Tailwind 4，删除旧壳，无新增页面 CSS |
| token/断点/静态扫描/冲突 | 沿用项目映射与 lg，无硬编码颜色或 important 补丁 |
| 工具类/体积/浏览器回归 | 样式检查、同口径体积对照、移动/焦点/reduced-motion 已执行，不等同完整业务验收 |
