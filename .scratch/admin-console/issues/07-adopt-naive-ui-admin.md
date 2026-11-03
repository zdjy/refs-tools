# 07：直接采用 Naive UI Admin 模板替换自研后台应用壳

Status: implemented-pending-authorized-acceptance
Blocked by: 无，可立即开始；01–03 的现有会话、审计和部署作为迁移基线保留
Spec: [FS-0007 第 2、6、7 节](../../../docs/specs/0007-admin-console.md)
Decision: [ADR 0017](../../../docs/decisions/0017-admin-template-selection.md)

## 目标

直接使用 `jekip/naive-ui-admin` MIT 开源版 `v3.0.0`，固定 commit `c9db4cde447240eaa17fbe439f507680819add3d`，替换 `apps/admin-web` 自研后台基础框架。不得仅参考截图后再次仿写应用壳。

## 交付

- 建立上游来源、保留路径、本地改动和 MIT 许可记录；直接迁入并使用模板 layout、Header、Menu、Main、移动 Drawer 等，优先复用其表单、表格、Modal 和状态页。
- 保留并适配现有 Cookie 会话、登录/审计 API adapter、内存状态和真实查询测试，不换 API，不部署模板配套后端，不引入虚构业务功能。
- 剔除演示登录、Mock、演示统计、Token/私有数据持久化和不需要的重型依赖。保留模板导航呈现但采用既有静态路由；关闭私有业务视图 KeepAlive。
- 沿用现有 workspace 版本，验证上游 Pinia/Router/Vite/TS 的兼容；完成 Tailwind 3 到现有 Tailwind 4 接入及集中 FIBA 主题适配。模板源码迁入遵循统一规约，不静默豁免 SFC 长度、状态/API 分层和样式要求。
- 保持 Nginx `/admin/` 静态部署，更新来源说明、构建体积和迁移验收记录，不改动裁判端交互。

## 验收

- 可追溯到固定上游源码；实际渲染的是模板的后台基础布局，不是原自研壳改名或截图仿制。报告保留模块及必要修改，明确移除了哪些演示能力。
- 既有登录、会话恢复、退出失败、401/403、审计游标、空/错/加载/重试、失效响应与页面清理测试继续通过；生产无模拟成功、假计数或不存在的 API 请求。
- 生产产物不包含启用的 Mock；认证凭据/私有审计不落持久缓存、不注册 Service Worker；路由菜单不冒充 API 授权，未经授权不能读私有记录。
- typecheck、相关低内存单测、生产构建、样式生成及第三方许可检查通过；报告相比迁移前的 JS/CSS 体积差异，不能引用上游压缩体积替代本项目实测。
- 按 FS-0007 验收 320/375/768/1100/1440px、长 UUID/理由、44px 触控、键盘、可见焦点、菜单焦点约束/恢复、Escape、reduced-motion、登录/审计错误态与 `/admin/` 深链接。
- 使用授权测试账户验证真实会话与审计链路；若条件不足，明确未执行项，不把替身检查或上游在线演示当作真实授权验收。

## Comments

本 ticket 是选型后的实施工作。ADR 0017 的调研完成不代表本 ticket 完成，也不改变 04–06 业务接口尚待实施的状态。统一工程要求仅引用项目编码规约，不因使用模板另建一套规约。

2026-11-03：已直接复制固定 commit 的 layout/Header/Menu/Main/Logo/404 源码并完成裁剪与适配；原自研壳已删除，Cookie 会话/真实审计 adapter/服务端授权不变，无新增依赖。管理端 28 项单测、全仓 211 项快测、类型检查、生产构建、样式及上游 blob/许可/安全检查通过；300 MB 限制内最终单测峰值约 125.2 MiB。独立替身下完成五档布局、焦点/键盘/reduced-motion、登录/审计状态与离线验收，独立 Nginx 镜像及真实 API 匿名 401 边界通过。体积和逐项结果见[迁移验收记录](../../../docs/specs/0007-admin-template-acceptance.md)，源码映射见[第三方说明](../../../apps/admin-web/third-party/naive-ui-admin/README.md)。

未提供授权测试账号，未创建或提升管理员；真实登录/会话/审计数据库链路未执行，故不标记全部验收完成。既有传递依赖缺少随包 LICENSE 正文的限制亦已明确记录，不宣称完成全部供应链法律审计。
