# Architecture Decision Records

Store consequential technical and product decisions in this directory. Use sequential names such as `0001-static-spa-deployment.md`. Each record should capture status, context, decision, alternatives considered, and consequences. Do not record secrets or environment-specific credentials here.

## Decision index

- [ADR 0001: Monorepo with Static Client Apps and a Separate API](./0001-monorepo-static-apps-and-api.md) — use a pnpm workspace with independently built referee/admin SPAs and a separately deployed lightweight API.
- [ADR 0002: Direct Browser-to-Object-Storage Media Flow](./0002-direct-to-object-storage-media-flow.md) — issue short-lived scoped upload/read access while keeping media bytes off the 2C2G API host.
- [ADR 0003: Scoped RBAC with Explicit Assignment Workflow](./0003-scoped-rbac-and-assignment-workflow.md) — combine baseline roles, explicit scope bindings, separate qualification attributes, and audited assignment state transitions.
- [ADR 0004：API、数据库与认证技术基线](./0004-api-database-and-auth-stack.md) — use Fastify/TypeScript, PostgreSQL, and revocable server-side sessions.
- [ADR 0005：对象存储供应商基线](./0005-object-storage-provider.md) — use Alibaba Cloud OSS behind an isolated provider adapter.
