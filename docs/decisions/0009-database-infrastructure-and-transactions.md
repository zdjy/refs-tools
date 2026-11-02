# ADR 0009：数据库基础设施归属与应用事务端口

- 状态：已接受
- 日期：2026-11-02

## 背景

ADR 0004 选择 `pg` 参数化 SQL 和轻量迁移运行器。当前 API 尚无业务 Repository，数据库代码集中在 `src/db/`，其中 `pool.ts` 同时承担连接配置与事务执行。旧规约要求 Service 发起事务并传递事务句柄，现有 helper 的回调类型是 `PoolClient`；直接沿用会让应用用例依赖数据库驱动。

需要在业务模块落地前明确数据库基础设施的位置，并提供可注入、可脱离 PostgreSQL 测试的事务边界。统一编码约束仍仅维护在[编码规约第二章](../agents/coding-standards.md#3-数据访问事务与-ddd-边界)。

## 决策

保留 ADR 0004 的 Fastify、PostgreSQL、`pg`、编号 SQL 迁移和连接预算，不增加运行时依赖。将 `src/db/` 的连接池、迁移执行器及 CLI 移至 `src/infrastructure/database/`；SQL 文件仍位于 `apps/api/db/migrations/`，部署时继续随 API 保留。

在 `src/application/transaction.ts` 定义泛型 `TransactionRunner<Repositories>`，应用层仅通过 `run(work)` 获得面向用例的 Repository 集合。数据库适配器接收连接池及 Repository 工厂，每次事务从池获取一条连接，并以该连接构造全部 Repository。底层 `withTransaction` 仅供基础设施和数据库测试使用，保持提交、回滚、回滚失败销毁连接及原始异常保留的行为。

应用装配入口负责创建/关闭连接池、组装 Repository 与事务端口；业务模块的无驱动 Repository 接口就近维护在 `*.types.ts`。当前不增加全局数据库实例、AsyncLocalStorage、隐式嵌套事务或自动重试。没有业务端点的数据库基础设施不创建 routes/schema/service 文件。

## 备选方案

- **Service 直接使用 `PoolClient`**：实现简单，但应用层依赖驱动且容易绕过 Repository 执行 SQL，未采用。
- **不透明事务 token + 全局连接映射**：可以隐藏驱动，但需要管理 token 生命周期和额外映射，易产生跨事务连接误用；当前没有必要。
- **AsyncLocalStorage 隐式事务**：减少参数传递，但隐藏连接依赖与嵌套语义，增加调试成本，未采用。
- **ORM / 通用 Unit of Work 框架**：当前没有对象跟踪或复杂映射需求，额外依赖和抽象不足以抵消维护成本，未采用。

## 后果

- Service 可以使用内存 Repository/事务端口替身测试；真实 SQL、约束与原子性继续通过显式测试库和独立 `pnpm test:db` 验证。
- 迁移 CLI 的源码和构建入口路径改变，运行脚本、数据库说明及 Task 2 文件索引同步更新；迁移 SQL、历史记录和数据库结构不变。
- Repository 工厂必须使用传入连接；类型系统不能阻止工厂闭包错误捕获池或 Repository 逃逸，仍需实现审查与真实事务测试。
- 后续跨模块原子用例需要显式组装参与者的端口，复用当前事务上下文；若确需保存点或跨进程协调，再以具体需求补充决策。
