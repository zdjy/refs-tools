# 架构决策记录

本目录记录重要技术与产品决策，按顺序命名，例如 `0001-static-spa-deployment.md`。每份 ADR 应说明状态、背景、决策、备选方案及后果，不得包含密钥或环境专属凭据。

开发规约仅维护在[编码规约索引](../agents/coding-standards.md)链接的主题文档中，由根级 [`AGENTS.md`](../../AGENTS.md) 引用；ADR 记录具体选型及原因，不重复维护 DDD 或编码规约。

## 决策索引

- [ADR 0018：裁判端内置编辑内容与 Lucide 图标](./0018-editorial-content-and-icons.md) — 公开自编导读与讨论示例不冒充真实业务内容，按需使用官方 Vue 图标组件，不增加后端或缓存。

- [ADR 0017：直接采用 Naive UI Admin 作为管理端模板](./0017-admin-template-selection.md) — 选定 MIT 开源版 v3.0.0 并完成后台壳源码迁移，保留 Cookie 与服务端授权；真实授权账号链路待补验。
- [ADR 0016：独立管理端与渐进业务接入](./0016-admin-web-foundation.md) — 独立 `/admin/` 静态 SPA，复用 Cookie 与审计契约，不伪造未完成业务；原“不引入模板”决定已由 ADR 0017 替代。

- [ADR 0001: Monorepo with Static Client Apps and a Separate API](./0001-monorepo-static-apps-and-api.md) — use a pnpm workspace with independently built referee/admin SPAs and a separately deployed lightweight API.
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
