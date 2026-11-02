# ADR 0004：API、数据库与认证技术基线

- 状态：已接受
- 日期：2026-11-01

## 背景

Task 1 需要在业务模块开始前确定轻量 API、关系数据库和认证边界。生产环境限制为 2 CPU、2 GB 内存，前端构建产物由 Nginx/CDN 静态托管，API 不应承担媒体字节传输。

## 备选方案

### API

- **Fastify + TypeScript**：依赖小、HTTP 性能开销低，提供 `inject()` 测试接口和清晰的插件边界。
- Express：生态成熟，但需要额外组合请求校验、错误处理和插件约定。
- FastAPI：性能和类型体验良好，但会引入 Python 运行时与另一套工具链。

### 数据库

- **PostgreSQL**：符合规格中的首选，支持事务、约束、JSONB 和后续审计/状态机需求。
- SQLite：部署简单，但不适合作为多用户生产服务的默认数据库。
- MySQL：可行，但当前没有足以抵消 PostgreSQL 生态和团队约定的理由。

### 认证

- **服务端会话 + HttpOnly Secure Cookie**：服务端保留可撤销会话，浏览器只持有不可推断的 opaque session ID。
- JWT：适合无状态验证，但角色绑定和撤权要求每次保护请求重新读取服务端状态，JWT 快照容易过期。
- 第三方身份平台：可以后续通过 provider adapter 接入，但当前会增加外部依赖和部署配置。

## 决策

采用 Fastify + TypeScript 作为 API 基线，PostgreSQL 作为生产关系数据库，认证采用服务端可撤销会话。API 统一使用 `/api/v1` 前缀和 JSON transport contract；请求输入在 API 边界使用运行时 schema 校验。

Task 2 采用 `pg` 直接执行参数化 SQL，以保持运行时依赖较小；相比 ORM，无需引入模型生成和额外查询抽象。迁移采用编号 SQL 文件及显式 up/down 段，由轻量运行器管理历史，不引入独立迁移框架。开发命令使用 `tsx` 执行 TypeScript，生产仍可使用编译后的 Node.js 入口。

API 池默认最多 5 条连接，空闲连接 10 秒回收、获取连接超时 5 秒；`DATABASE_POOL_MAX` 必须为正整数。业务 service 通过事务 helper 编排，SQL 和池实例仅在 repository 或数据库基础设施中使用；本任务不新增业务端点及全局连接实例。每次迁移命令在同一事务内执行，并在创建历史表前获取事务级 advisory lock，避免并发迁移。核心迁移仅提供共享更新时间触发器函数；身份、审计、媒体、组织表分别留在后续任务建立。

数据库集成测试通过独立 `pnpm test:db` 运行，必须设置 `TEST_DATABASE_URL`。每次测试创建唯一 schema，清理只作用于该 schema。测试池最多 2 条连接，schema 管理池最多 1 条连接；单 worker 串行执行。会话存储细节在 Task 3 补充。

## 后果

- API 可以保持独立、无状态的业务进程；会话状态应放在 PostgreSQL 或专用低开销会话存储，而非进程内存。
- `packages/contracts` 是客户端/API 共享的 transport 边界；不得放入服务端密钥或存储 SDK。
- 未来若接入外部认证，仍需映射为本地用户和服务端会话，以便处理邮箱验证、角色撤销和对象级授权。
