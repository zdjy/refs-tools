# 架构决策记录

本目录记录重要技术与产品决策，按顺序命名，例如 `0001-static-spa-deployment.md`。每份 ADR 应说明状态、背景、决策、备选方案及后果，不得包含密钥或环境专属凭据。

开发规约仅维护在[编码规约索引](../agents/coding-standards.md)链接的主题文档中，由根级 [`AGENTS.md`](../../AGENTS.md) 引用；ADR 记录具体选型及原因，不重复维护 DDD 或编码规约。

## 决策索引

- [ADR 0025：平台组织治理与首次运营授权边界](./0025-admin-organization-governance.md) — 组织审核、成员/默认角色与审计原子提交，冻结保留历史且解冻不恢复已撤销授权。

- [ADR 0024：开发阶段使用 pgsty/minio，上线切换云对象存储](./0024-local-minio-and-cloud-storage-switch.md) — 本地私有 S3 直传、独立 TLS/CORS 入口与配置化供应商切换，保留 OSS 适配器。

- [ADR 0023：前端请求层迁移至 alova，并按 DDD 封装网关](./0023-alova-http-client-and-ddd-gateway.md) — 统一使用 alova/fetch，禁用缓存与请求合并；传输客户端、上下文网关（防腐层）、应用层三层分离。

- [ADR 0022：管理端用户 CRUD 与 Cookie 会话边界](./0022-admin-user-crud-and-cookie-boundary.md) — 管理端使用真实 Cookie 会话和最小用户投影，用户变更与实时授权、会话撤销及审计保持事务一致。

- [ADR 0021：媒体控制面与不可覆盖上传](./0021-media-control-plane.md) — OSS SDK 隔离、短事务核验、默认拒绝未实现业务目标、可信事件桥与有界清理。

- [ADR 0020：裁判端 UI 基线切换为 macOS 毛玻璃规范](./0020-macos-vibrancy-ui-baseline.md) — 唯一 UI 基线改为 macOS 毛玻璃（FIBA 暖沙金），圆角、阴影、动效与毛玻璃分层随之调整。

- [ADR 0019：裁判端引入 Motion 动画库与模拟论坛内容](./0019-motion-and-simulated-forum-content.md) — 仅在首页与阅读页使用 motion，reduced-motion 全部关闭；模拟论坛仅限示例角色与示例值。

- [ADR 0018：裁判端内置编辑内容与 Lucide 图标](./0018-editorial-content-and-icons.md) — 公开自编导读与讨论示例不冒充真实业务内容，按需使用官方 Vue 图标组件，不增加后端或缓存。

- [ADR 0001: Monorepo with Static Client Apps and a Separate API](./0001-monorepo-static-apps-and-api.md) — use a pnpm workspace with a referee SPA and a separately deployed lightweight API.
- [ADR 0002: Direct Browser-to-Object-Storage Media Flow](./0002-direct-to-object-storage-media-flow.md) — issue short-lived scoped upload/read access while keeping media bytes off the 2C2G API host.
- [ADR 0003: Scoped RBAC with Explicit Assignment Workflow](./0003-scoped-rbac-and-assignment-workflow.md) — combine baseline roles, explicit scope bindings, separate qualification attributes, and audited assignment state transitions.
- [ADR 0004：API、数据库与认证技术基线](./0004-api-database-and-auth-stack.md) — use Fastify/TypeScript, PostgreSQL, and revocable server-side sessions.
- [ADR 0005：对象存储供应商基线](./0005-object-storage-provider.md) — use Alibaba Cloud OSS behind an isolated provider adapter.
- [ADR 0006：裁判端前端技术栈](./0006-referee-web-frontend-stack.md) — use Vue 3/TypeScript and Vite to build a static referee SPA.
- [ADR 0007：Vue 裁判端 UI 框架](./0007-vue-ui-framework.md) — use Naive UI 2.x for typed, themeable Vue base components.
- [ADR 0009：数据库基础设施归属与应用事务端口](./0009-database-infrastructure-and-transactions.md) — 数据库适配集中于 infrastructure，以无驱动端口向用例提供事务内 Repository。
- [ADR 0010：邮箱验证、密码与会话安全](./0010-email-auth-and-session-security.md) — 邮箱 challenge、SMTP、服务端可撤销 Cookie 会话与认证安全边界。
- [ADR 0011：本机完整联调的 Docker Compose 环境](./0011-local-compose-environment.md) — 静态前端、API、PostgreSQL、TLS 本地邮箱和隔离测试库的一键启动。
- [ADR 0012：邮箱验证后首次设置密码免重复验证](./0012-initial-password-after-email-verification.md) — 已验证且无密码账号直接设置首次密码，已有密码修改保留邮箱重验。
- [ADR 0013：前端样式采用 Tailwind CSS](./0013-tailwindcss-styling.md) — 使用 Tailwind CSS 4.x 与官方 Vite 插件，复用 FIBA token，现有界面已完成迁移并保留必要 CSS 例外。
- [ADR 0014：实时作用域授权与追加式审计基础](./0014-scoped-authorization-and-audit-foundation.md) — 提前建立最小归属骨架，使用实时角色/成员门禁和同事务追加审计，区分平台与组织权限。
- [ADR 0015：采用 Casbin 作为服务端授权引擎](./0015-casbin-authorization-engine.md) — API 使用固定只读策略匹配角色/权限/作用域，保留纯领域约束、实时数据库授权及事务一致性。
