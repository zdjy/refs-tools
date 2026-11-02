# PostgreSQL 迁移与测试

架构依据见 [ADR 0004](../../../docs/decisions/0004-api-database-and-auth-stack.md) 与 [ADR 0009](../../../docs/decisions/0009-database-infrastructure-and-transactions.md)，DDD 边界统一遵循[编码规约第二章](../../../docs/agents/coding-standards.md#3-数据访问事务与-ddd-边界)，验收范围见 [FS-0002 Task 2](../../../docs/specs/0002-mvp-platform-feature.md#task-2数据库迁移与事务测试基架)。

## 运行命令

部署环境设置 `DATABASE_URL`（或标准 `PGHOST`、`PGPORT`、`PGDATABASE`、`PGUSER`、`PGPASSWORD`），随后执行：

```sh
pnpm --filter @refs-tools/api db:migrate
pnpm --filter @refs-tools/api db:rollback
```

`db:migrate` 应用所有待执行文件，重复运行无副作用；`db:rollback` 只回滚最后一条记录。使用编译产物时，执行 `node apps/api/dist/infrastructure/database/migrate.js up` 或 `down`，并保留相邻的 `apps/api/db/migrations` 目录。迁移账号需要目标 schema 的 DDL 权限，业务运行账号不应拥有迁移权限。

迁移文件格式为 `NNNN_name.sql`，必须各有一个 `-- migrate:up` 和 `-- migrate:down` 标记，up 在前、down 在后。不在迁移文件内自行提交事务。迁移失败会回滚本次命令的全部变更；历史表保留已成功执行的编号。已应用迁移保持不变，后续修订新增文件。

## 测试与隔离

```sh
pnpm test
# 由部署/本地环境注入独立测试数据库 URL 后运行：
pnpm test:db
```

`test` 为低并发单测；`test:db` 要求显式设置 `TEST_DATABASE_URL`，缺失即失败。集成测试为每次运行创建随机 schema，仅删除自己创建的 schema，不删除 `public`，但仍应使用专用测试数据库和账号。测试账号需有创建 schema 的权限。业务表尚未进入 Task 2，唯一约束与外键由测试 schema 内的临时探针表验证。

## 2C2G 资源起点

API 池默认上限 5，可通过 `DATABASE_POOL_MAX` 配置，多个进程的池上限需要累加。测试使用单 worker、最多 2 条测试连接及 1 条管理连接，不加载浏览器或前端应用。单测通过 `node --max-old-space-size=192 node_modules/vitest/vitest.mjs run --config vitest.config.ts` 可限制 V8 heap；实际 RSS 应在部署/CI 环境测量。

PostgreSQL 与 API 同机时，建议以 `max_connections=20`、`shared_buffers=128MB`、`work_mem=2MB`、`maintenance_work_mem=32MB`、`effective_cache_size=512MB` 作为保守起点，并预留管理连接；这些值需结合连接总量、实际查询和系统可用内存调优，不作为性能承诺。凭据通过环境注入，生产连接使用 TLS，不将连接 URL 写入日志或仓库。
