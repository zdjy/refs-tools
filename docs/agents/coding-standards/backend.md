# 后端规约：Node.js + Fastify + PostgreSQL

本文件属于[全栈架构与编码规约](../coding-standards.md)。

## 1. 垂直切片模块组织 (`apps/api/src/modules/<feature>/`)

后端必须严格按照业务垂直切片（Vertical Slice Architecture）组织，严禁使用横向扁平结构。一个提供业务 HTTP 端点的模块必须拆解为以下 5 个物理文件；数据库基础设施与迁移工具不属于业务模块，不机械创建 routes/schema/service：

```
apps/api/src/modules/<feature>/
├── <feature>.routes.ts       # 路由声明、HTTP 状态码返回、中间件挂载
├── <feature>.schema.ts       # 路由输入输出验证 Schema（引用 contracts）
├── <feature>.service.ts      # 依赖 Repository/事务端口编排用例、权限及领域规则
├── <feature>.repository.ts   # 持久化适配器，SQL/ORM 查询执行与行数据映射
└── <feature>.types.ts        # 模块私有模型、Repository 契约及用例依赖（无驱动类型）

```

## 2. 各层物理边界与行数限制

| 文件类型 | 核心职责 | 禁止行为 | 行数上限 |
| ----- | ----- | ----- | ----- |
| **`*.routes.ts`** | 解析 HTTP 请求，调用 Service，返回 Response。 | 严禁编写 SQL；严禁包含 `if-else` 业务判断；严禁直接读取数据库。 | 单 Handler $\le 20$ 行  总文件 $\le 150$ 行 |
| **`*.schema.ts`** | 定义 Fastify 路由级别的 Params、Query、Body、Response 结构。 | 严禁在其中编写执行逻辑，纯静态 Schema。 | 总文件 $\le 150$ 行 |
| **`*.service.ts`** | 编排业务流程、聚合计算、调用 Repository、抛出业务异常。 | 严禁直接引入 DB Client 执行查询；严禁接触 Fastify 的 `request` 或 `reply` 对象。 | 单函数 $\le 40$ 行  总文件 $\le 200$ 行 |
| **`*.repository.ts`** | 纯粹的数据持久化操作，执行 SQL 或 ORM 方法。 | 严禁编写业务校验逻辑；严禁在此抛出 HTTP 状态错误。 | 单方法 $\le 30$ 行  总文件 $\le 200$ 行 |

## 3. 数据访问、事务与 DDD 边界

数据库是基础设施技术，持久化设计必须服从业务语义与一致性需求。沿用当前 single-context、业务垂直切片及 `pg` 参数化 SQL，不因采用 DDD 就新增 ORM、通用 CRUD 基类、Event Sourcing 或每表一套领域对象。技术选型见 [ADR 0004](../../decisions/0004-api-database-and-auth-stack.md)，当前基础设施与事务端口的取舍见 [ADR 0009](../../decisions/0009-database-infrastructure-and-transactions.md)。

### (1) 依赖方向与代码归属

| 位置 | 允许职责 | 禁止行为 |
| --- | --- | --- |
| `packages/contracts` | 跨端 DTO、请求/响应 Schema | 引入 `pg`、SQL、数据库行类型或连接配置 |
| `packages/domain` | 纯领域模型、不变量、状态转换 | 依赖数据库、ORM、Repository 实现或环境变量；将表结构当作领域模型 |
| `modules/<feature>/<feature>.types.ts` | 不含 IO 的模块私有模型、面向用例的 Repository 接口 | 暴露 `Pool`、`PoolClient`、`QueryResult`、SQL 字符串或通用 `query()` |
| `modules/<feature>/<feature>.service.ts` | 注入 Repository/事务端口，编排授权、领域规则和事务范围 | 导入具体 Repository 类、数据库基础设施或驱动；执行 SQL；自行获取/释放连接 |
| `modules/<feature>/<feature>.repository.ts` | 实现所属模块的持久化契约、执行参数化查询、映射行数据 | 承担领域决策或 HTTP 错误映射；自行提交/回滚用例事务 |
| `src/application/transaction.ts` | 定义不含驱动类型的应用事务端口 | 提供原始连接或通用 SQL 执行能力 |
| `src/infrastructure/database/` | 连接池、驱动事务适配、迁移加载/执行及 CLI | 承担裁判资格、选派、考试等业务规则；反向依赖业务 Service |
| 应用装配入口 | 创建有界连接池，注入 Repository 工厂和事务适配器，注册关闭清理 | 在模块顶层创建全局池；因装配而执行业务查询或迁移 |

* 依赖方向为 **Service → Repository/事务端口 ← 持久化适配器**。应用入口组装依赖，路由只调用已装配 Service；Service 不默认 `new` 具体 Repository。Repository 接口就近放入所属模块 `*.types.ts`，不为了隔离 IO 将服务端接口塞入共享 `contracts` 或 `domain`。
* `pg` 和连接/查询类型只允许出现在 Repository、数据库基础设施、装配入口以及独立数据库测试中。业务路由、Service 和模块对外契约均不能依赖这些类型；基础设施内的连接、迁移 SQL 不受“业务 SQL 只能在 Repository”限制。
* 连接池由装配入口显式创建并负责关闭，继续遵守 ADR 0004 的连接和超时预算；迁移 CLI 拥有独立生命周期和 DDL 权限，不在 API 请求中自动执行迁移。生产业务账号不因运行 API 而获得 DDL 权限。

### (2) Repository、模型与模块所有权

* 按聚合一致性和用例设计 Repository 方法（如 `findById`、`saveWithVersion`），不按数据库每张表机械生成 CRUD。聚合内的实体可跨表持久化，由所属 Repository 保证完整映射；跨聚合引用优先使用 ID，不把数据库外键关系直接展开成可修改对象图。
* Repository 契约使用领域/应用语义的输入、返回值与失败结果；查询列表可以返回按用途限定的只读投影，不强求所有读取先重建聚合。内部行类型放在 Repository 或同模块私有持久化映射文件中，不进入共享 DTO 或 `*.types.ts` 的公开接口。
* 显式选择必要字段并完成 `snake_case → camelCase`、空值、时间和数据库数值类型转换；不得将 `SELECT *`、驱动结果对象、密码哈希、答案 key 等整行数据直接作为 API 响应。使用 DTO 类型参数不能替代实际行映射。
* 每张业务表有明确所属模块。跨模块写入通过拥有者的应用服务/端口协调，不直接导入其他模块的 Repository 或改写其表；确需跨模块只读联表时，建立有明确所有者、授权范围及最小字段的查询投影，不借此绕过业务写入边界。
* Repository 可以执行条件更新、行锁及必要约束，返回“未找到/版本冲突/约束冲突”等中性结果；预期数据库约束错误应按 SQLSTATE 和约束名定向识别，由 Service 转为业务错误，不能把所有数据库异常都伪装成冲突。

### (3) 事务、一致性与并发

* **应用层决定事务范围，基础设施执行事务**：Service 注入 `TransactionRunner<Repositories>`，通过 `run(async (repositories) => ...)` 编排原子用例。适配器在同一 `PoolClient` 上执行 `BEGIN/COMMIT/ROLLBACK`，为回调构造绑定该连接的 Repository；Service 不接收或传递驱动句柄。
* 事务内所有 Repository 必须绑定该事务的同一连接，不能混用 `pool.query()`、另开连接或调用会开启独立事务的 Service。嵌套用例复用现有 Repository 上下文；当前不提供隐式嵌套事务、保存点或自动重试。
* 事务 Repository 只在回调期间使用，不缓存到模块/实例、不从回调返回、不启动未等待的异步写入。事务保持短小，不在其中上传媒体、调用第三方 HTTP/邮件或执行长耗时任务。
* 聚合不变量由领域函数/模型表达，数据库以主键、外键、唯一及 CHECK 约束兜底；不能仅以“先查再写”防并发。按用例选择版本条件更新、唯一约束或行锁，Service 对失败作明确业务处理。涉及跨聚合原子性时依据规格显式协调，不把“一聚合一事务”机械套用到审计一致性需求。
* 业务变更与要求原子一致的审计、outbox 记录同事务提交；外部通知在提交后处理，需可靠重试时使用规格要求的 outbox。未经需求与 ADR 不引入消息中间件或分布式事务。
* 连接始终释放；回滚失败销毁连接并保留原始异常。事务适配器只负责事务资源语义，不生成 HTTP 错误、不吞异常或擅自重试非幂等命令。

### (4) 迁移与验证

* `apps/api/db/migrations/` 保留编号 SQL 文件和显式 up/down；迁移属于基础设施，不建立业务五文件。已应用文件不可改写，修订新增迁移；约束、索引、版本字段及数据回填应对应所属业务需求，破坏性变更先明确数据保留和部署兼容策略。
* SQL 值一律参数化；必须动态选择表名、排序字段等标识符时仅使用服务端白名单，不拼接客户端输入。迁移 SQL 来自受版本控制的本地文件，不作为通用执行外部 SQL 的入口。
* Service 测试以 Repository/事务端口替身验证用例与业务失败，不加载 PostgreSQL；事务适配单测验证提交、回滚、异常和连接释放。真实 SQL、行映射、约束、锁及并发一致性通过独立 `pnpm test:db` 验证，不能只靠 mock 宣称数据库行为正确。测试库显式配置、schema 隔离与连接预算仍遵守 ADR 0004。
* **业务异常统一**：Service 层只抛出带业务错误码的 DomainError（如 `NotFoundError`, `ConflictError`），由全局错误处理器转换为 HTTP 404/409；数据库连接、迁移等基础设施故障保留异常并交由统一边界处理，不将驱动错误或凭据返回客户端。
