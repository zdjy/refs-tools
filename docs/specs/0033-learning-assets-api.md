# FS-0033：学习分类、资料版本与受控媒体发布 API

- 范围：FS-0002 Task 9；ticket 06 的资料后端部分。
- 状态：后端实现及自动化验收完成；学习管理/阅读 UI、真实对象存储端到端、考试历史引用授权尚未交付。
- 决策：[ADR 0039](../decisions/0039-learning-versions-and-media-access.md)。

## 1. 用户行为

- 登录用户可分页浏览已发布资料、检索标题/摘要、按有效分类筛选并读取当前发布正文；邮箱未验证者也可浏览。分类最多三级，支持多对多挂载。分类停用保留历史引用，资料无有效分类时属于未分类；本期不提供物理删除分类。
- 平台管理员管理分类的创建、改名、移动与停用。移动不得产生环或令任何后代超过三级，更新要求 `expectedRevision`；创建要求 `Idempotency-Key`。分类同 slug 返回 409，失败不写审计。
- 内容编辑创建草稿、追加修订和发布；创建要求 `Idempotency-Key`，同键同内容重放复用资料，异内容返回 409。修订、发布与下线要求 `expectedRevision`。正文是纯文本段落，最多 100 段、每段 10000 字符，不接受 HTML 字段；媒体最多 20 个、分类最多 20 个。
- 每个修订的标题、摘要、正文、下载策略和引用均不可变。追加新修订不改变读者当前版本；发布只允许最新修订，空正文且无媒体不能发布。重复/陈旧发布返回 409。
- 内容编辑或平台管理员可下线。下线后普通列表、正文与媒体授权不可访问；编辑可查看历史快照。既有考试/答卷将通过后续所属模块的引用和授权使用旧快照，本次不提供考生历史 API。
- 新挂载媒体须为本人上传、learning 用途、platform 目标、available，且核验大小与预期一致；已有同资料上一修订媒体允许另一位编辑沿用。创建、修订与发布均校验媒体状态，发布重新检查类型和大小。使用已有策略的图片原图上限 20 MiB，上传阶段仍区分 preview/original。
- 在线查看/下载仅签发 60 秒私有媒体 URL，不经过 API 传输字节；查看 inline，下载 attachment 且要求发布版本 `allowDownload=true`。返回 URL 前重新检查实时账号、资料 revision、发布状态及媒体可用性，并同事务审计。不存在、草稿、下线或不属于当前资料的媒体返回 404；禁用下载返回 403。
- 所有学习响应禁止缓存。签名 URL 不写数据库、日志或审计；前端后续接入时不得默认持久缓存正文或 URL。下载策略不能阻止用户保存在线内容，已签发 URL 在下线后最多仍存活 60 秒。
- 已关联任何版本的媒体均保留，普通删除和治理删除返回 `MEDIA_RETENTION_REQUIRED`；历史不可变引用不能因通用删除而失效。

## 2. API 契约

所有路径前缀 `/api/v1`，返回 `{ data }`。列表统一 `page/pageSize` 与 `{items,total,page,pageSize}`，默认 20、最大 100，详见共享分页契约；本次细化替代 FS-0002 §3.5 的 cursor 草案，不实现 tag 筛选。

| 方法与路径 | 用途/权限 |
| --- | --- |
| `GET /learning/categories` | 登录者读取 active 分类 |
| `GET /admin/learning/categories` | platform.manage 读取含停用分类的分页 |
| `POST /admin/learning/categories` | platform.manage 创建；parentId/name/slug/status 与幂等键 |
| `PATCH /admin/learning/categories/:id` | platform.manage 更新完整字段和 expectedRevision |
| `GET /learning/assets` | 登录者按 q/categoryId 分页读取发布摘要 |
| `GET /learning/assets/:id` | 登录者读取 `{asset,content}` 当前发布版本 |
| `GET /admin/learning/assets` | content.edit 按 q/categoryId 分页查询所有资料最新摘要 |
| `GET /admin/learning/assets/:id` | content.edit 读取最新修订 |
| `POST /admin/learning/assets` | content.edit 创建，必需幂等键 |
| `POST /admin/learning/assets/:id/versions` | content.edit 追加完整内容与 expectedRevision |
| `POST /admin/learning/assets/:id/publish` | content.edit，expectedRevision/version |
| `POST /admin/learning/assets/:id/unpublish` | content.unpublish，expectedRevision |
| `GET /admin/learning/assets/:id/versions` | content.edit 分页读取历史 |
| `GET /admin/learning/assets/:id/versions/:version` | content.edit 读取不可变快照 |
| `GET /learning/assets/:id/media/:mediaId/read-url?mode=view\|download` | 登录者按当前发布关系实时申请媒体授权 |

精确字段与输入边界以 `packages/contracts/src/learning.ts` 为单一载荷来源。写操作要求当前账号已验证邮箱；权限沿用现有授权引擎矩阵，不凭客户端角色或主体字段授权。

## 3. 数据与部署

应用 `apps/api/db/migrations/0012_learning_assets.sql` 后再发布新 API。分类、资料、修订、发布记录及引用由 learning 模块拥有；媒体表继续由 media 模块拥有。媒体模块仅增加最小只读关联存在性投影，删除仍经媒体用例。数据库触发器补充历史媒体留存保护。

回滚 `0012` 删除所有学习数据，仅用于未上线/可丢弃环境；生产回滚优先回退应用并保留已迁移表。使用现有迁移 CLI 与部署账号，不在请求内自动迁移。关闭媒体功能时正文与目录仍可用，媒体授权返回 503。

## 4. 验收记录

- 全量快测：126 文件、754 项通过（`NODE_OPTIONS=--max-old-space-size=192`，该值限制 V8 heap，未测本轮实际峰值 RSS，不宣称验证进程内存低于 300 MiB）。
- 全量独立 PostgreSQL：18 文件、98 项通过，包含本任务 5 项；验证第 4 层/环/子树移动、数据库深度约束、不可变历史、多个分类筛选、停用/下线保留引用、媒体留存、同键并发创建、并发发布、实时撤权和审计失败回滚。
- 学习单测/HTTP：4 文件、13 项通过；含未验证邮箱浏览、原始 HTML 字段拒绝、版本冲突、媒体用途/owner/状态、下载策略及签名期间下线/停用/删除/修订的二次检查。
- `pnpm typecheck`、`pnpm build` 通过；构建覆盖 workspace，管理端不在当前 workspace 脚本范围。本次无前端变更，无浏览器、触控、样式体积或视觉验收需求。
- 未在开发业务库或生产库运行迁移，未用真实 OSS/MinIO 执行本业务端到端上传/阅读，不标为已验收。

## 5. 交付自检

按 workflow 清单逐项核验：

| 项 | 结论 |
| --- | --- |
| SQL 分层 | SQL 仅 Repository 和迁移，路由/Service 无 SQL |
| Repository/事务端口 | 无驱动模型，入口注入，同连接事务；Service 不接触 pg |
| 事务/审计 | 存储签名事务外，返回前复验；审计失败回滚有真实测试；通用事务适配未修改 |
| 表所有权/并发 | learning 所有权明确，FK/CHECK/不可变触发器、advisory lock、revision 与幂等唯一约束；真实迁移 up/down 通过 |
| Vue 行数 | 无 Vue 变更，不适用 |
| Vue HTTP 分离 | 无前端请求，不适用 |
| 请求层 | 无 alova/前端网关变更，不适用 |
| 共享载荷 | TypeBox DTO 集中在 contracts/learning |
| 规则/Service 测试 | 四个 Service 均由针对性用例覆盖；无新增 domain 导出规则 |
| 授权 | 沿用实时 Casbin 策略，无角色缓存或授权副本；撤权与请求门禁有测试 |
| Naive UI 边界 | 无组件库变更，不适用 |
| 通用/业务组件 | 无前端组件，不适用 |
| 主题 | 无 UI 变更，不适用 |
| 表单/操作反馈 | 本次仅 API，前端反馈不适用；API 明确 403/404/409/422/503 |
| 弱网/异步反馈 | 无客户端异步入口，不适用 |
| 状态分层 | 无 Pinia/持久化客户端状态，不适用 |
| Router | 无导航变更，不适用 |
| UI/可访问性验收 | 无 UI 变更，不适用；类型与生产构建通过 |
| 注释 | 中文解释锁、历史留存与签名顺序，无死代码和无 issue TODO |
| 单位/边界 | 字节/TTL/版本边界引用既有策略及本规格，无竞赛规则假设 |
| Tailwind 使用 | 无样式变更，不适用 |
| token/扫描 | 无样式变更，不适用 |
| 样式产物/浏览器 | 无样式变更，不适用 |
