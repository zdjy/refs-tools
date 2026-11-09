# FS-0030：认证记录、私有证据与申诉 API

- 状态：后端已实现并通过自动化验证；两端业务界面与真实存储端到端验收待完成。
- 范围：FS-0002 Task 8 的 API、共享契约、领域规则、迁移与后端验收。
- 依据：[FS-0001 §7](0001-mvp-scope-and-business-rules.md#7-认证与资质)、[FS-0002 Task 8](0002-mvp-platform-feature.md#task-8认证记录私有证据和申诉)；取舍见 [ADR 0036](../decisions/0036-certification-history-and-evidence-access.md)。

## 1. 当前行为

- 组织认证仅接受当前 active 组织的正式成员；提交后由该组织 certifier 审核，禁止自审。owner 可撤销本组织认证，但不能仅凭 owner 身份批准普通认证。
- 平台申请创建及提交时要求至少一个当前有效组织认证、成员关系及 active 组织；平台管理员独立审核。平台认证不因组织认证撤销而自动撤销。
- 级别为 `national/level_1/level_2/level_3`，不排序、不授予角色。
- 创建保存 draft，提交进入 under_review；审核可批准、驳回或要求补件，批准后支持人工暂停、恢复或撤销。所有变更带版本；创建必须携带 `Idempotency-Key`。
- 补件只允许 draft 或 needs_more_information，材料编辑生成新版本。证书编号、发证机构、个人声明、原件与履历材料必填；取得日期可空。原件/履历每类 1–10 个，申诉补充证据最多 10 个，均须本人所有、认证用途、已核验且 scope 合法；不同认证范围分别上传。
- 一个用户在每个组织与平台各保留一个聚合；驳回通过申诉继续，撤销不支持另建记录绕过历史。记录及各次材料、决定历史保留。
- `status` 是人工结论；`effectiveStatus` 是当前效力。成员退出/移除或组织冻结使已批准组织认证效力暂停；恢复成员关系或组织后恢复，人工暂停/撤销不恢复。待审组织申请从审核队列隐藏且不能决定。组织冻结时不能提交新申诉。
- 申诉独立为 pending/decided；仅驳回、撤销结果可申诉，提交不改变原认证效力。结论支持维持、改判批准或要求补件，均保留历史。组织 owner 复核组织申诉，另一平台管理员复核平台申诉，申请人和原审核人必须回避。每个认证最多一个 pending 申诉；待处理申诉期间普通审核不可修改结论。

## 2. 接口

以下均以 `/api/v1` 为前缀，沿用已验证 Cookie 会话、写请求精确 Origin 门禁，所有响应包括错误均 no-store。

| 方法与路径 | 行为 |
| --- | --- |
| `POST /certifications` | 创建草稿；Idempotency-Key；201 |
| `GET /me/certifications` | 本人分页摘要，不含证书编号和材料 |
| `GET /certifications/:id` | 本人或当前范围 certifier / 平台审核员读取详情并审计 |
| `PATCH /certifications/:id` | 本人补件，expectedVersion |
| `POST /certifications/:id/submit` | 本人提交，expectedVersion |
| `GET /certifications/:id/history` | 受控完整历史，分页并审计 |
| `GET /organizations/:orgId/certifications/review-queue` | 本组织 certifier 待审摘要 |
| `GET /admin/certifications/review-queue` | 平台管理员的平台申请待审摘要 |
| `POST /organizations/:orgId/certifications/:id/decision` | 组织人工决定，expectedVersion、decision、reason |
| `POST /organizations/:orgId/certifications/:id/revoke` | owner/certifier 撤销，expectedVersion、reason |
| `POST /admin/certifications/:id/decision` | 平台人工决定，expectedVersion、decision、reason |
| `POST /certifications/:id/appeals` | 本人申诉，expectedVersion、reason、evidenceMediaIds；201 返回独立 pending 申诉 |
| `GET /certifications/:id/appeals` | 本人/复核权限读取，分页并审计 |
| `GET /organizations/:orgId/certifications/appeal-queue` | owner 待复核认证摘要 |
| `GET /admin/certifications/appeal-queue` | 平台管理员待复核认证摘要 |
| `GET /certifications/:id/appeals/:appealId/application` | 本人/非原审核人的复核权限读取当前完整申请并审计 |
| `POST /certifications/:id/appeals/:appealId/decision` | 独立复核，expectedVersion、decision、reason |
| `GET /certifications/:id/evidence/:mediaId/read-url` | 本人/该认证审核范围读取已关联当前或历史证据，60 秒 |
| `GET /certifications/:id/appeals/:appealId/evidence/:mediaId/read-url` | 本人/非原审核人的复核权限读取原始及申诉证据，60 秒 |

集合接口使用共享 page/pageSize 与 `{items,total,page,pageSize}`。认证和申诉队列返回认证摘要，详情仍单独授权。错误组织 ID 与无权的组织资源隐藏为 404；平台门禁返回 403。版本冲突返回 409。普通文件治理入口下载认证原件返回 403 `CERTIFICATION_ACCESS_REQUIRED`，元数据仍可治理。

## 3. 留存与部署

应用 `0011_certifications.sql` 后再部署 API。四张认证表归 certifications 模块所有；精确运行权限见[授权与审计部署说明](../../apps/api/db/AUTHORIZATION_AUDIT.md)。历史和材料引用禁止修改或删除。对象继续由媒体模块上传/核验，认证专用入口只签发已关联的可用证据；无存储配置时签发返回 503。签名在事务外生成，返回前重新授权并写审计；URL 不落库、不进入审计或缓存。

## 4. 验收与剩余项

- 本轮全量快速测试：116 文件、675 项通过；独立 PostgreSQL 17 测试库：17 文件、91 项通过。认证新增领域 2 项、Service 10 项、HTTP 3 项、真实数据库 7 项；另补通用媒体治理入口拒绝认证原件的回归。最终补充申诉完整材料入口、退出后撤销与 task7 角色顺序回归后，相关 5 文件 43 项快测、认证 7 项真实数据库检查再次通过；未重复执行整套快测。
- 验证内容：幂等创建、材料用途/归属/范围、补件版本、自审、跨组织、实时撤权、成员退出/恢复及冻结、平台前置条件重验和独立效力、并发审核、冻结与平台提交的锁协调、申诉回避、不可变历史、审计故障回滚、签名期间撤权不返回链接、Cookie/Origin/Schema 门禁与 no-store。
- `pnpm typecheck`、workspace 生产构建通过。迁移包含从空 schema 升级、幂等、回滚与重新应用。
- 未实现：裁判端申请/材料/历史/申诉页面，组织审核/复核界面，管理端平台认证界面；指定复核员分配、通知、证据删除审批与法定留存清理。
- 未执行：真实 OSS/MinIO 文件上传到认证再读取的端到端联调、认证浏览器验收、生产/开发常驻库迁移。本轮只迁移独立测试 schema。
- 交付自检：SQL/驱动边界、单连接事务、版本/唯一约束、同事务审计、共享契约、Service/domain 测试、固定授权策略与实时撤权已核验；新增生产文件均在规约行数上限内，Service 函数按上限检查。UI、请求网关、Pinia、Router、Naive UI、Tailwind、触控/焦点/reduced-motion 为本次后端改动不适用；未新增依赖。最终相关快测使用 10ms RSS 采样，Vitest 进程（含测试线程）峰值约 157.2 MiB，启动进程约 41.0 MiB；该抽样检查低于 300 MB，不代表全套测试的持续进程树内存上界。
