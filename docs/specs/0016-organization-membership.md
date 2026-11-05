# FS-0016：组织成员与定向邀请

## 范围与边界

接续 [FS-0015](0015-admin-organization-management.md)，在管理端组织详情旁提供成员管理入口：分页查看成员与邀请、发起和撤销定向邀请、审核自主入会申请、移除成员。沿用 [FS-0010](0010-admin-color-theme.md) 与管理端 Tailwind 3 例外。组织成员码、组织角色编辑、自助创建及裁判端页面已由 [FS-0027](0027-referee-organizations.md) 接续；所有权移交仍为后续任务。

平台管理员可审计读取成员与邀请；写操作必须独立拥有当前组织的 owner/organizer 角色和正式成员关系，平台角色不隐式授予运营权限。页面显示服务端计算的操作能力，无能力时只读。冻结组织可由平台读取历史，但禁止新邀请、入会及成员写入。

## 行为

- 成员与邀请仅投影 ID、用户 ID、昵称、状态、版本和时间；不返回邮箱、实名、联系方式或凭据。分页默认 20、最大 100。成员名单额外接受可选 `keyword`（≤100 字符，按昵称子串匹配），过滤在 SQL 中完成，因此 `total` 与页数都是筛选后的结果；邀请列表不接受关键词。裁判端的使用方式见 [FS-0027](0027-referee-organizations.md) §13。
- 定向邀请输入已有用户 ID，有效期 1–30 天（默认 7 天）；目标必须账号有效、邮箱已验证，且不是当前正式成员。同一组织/用户只有一个待回应邀请；已过期邀请可被新的邀请取代，旧记录保留。
- 邀请有 pending/accepted/declined/revoked/expired 状态，过期时刻即失效。邀请不包含角色，也不自动成为成员。用户通过本人邀请列表和接受/拒绝 API 回应，其他用户不可读取或回应。
- 接受邀请激活当前 pending 成员关系或建立新 active 关系；重复接受/拒绝同一结果幂等，不重复变更/审计；反向回应、撤销、过期返回 409。接受时重新核验组织及账号。邀请接受不恢复历史撤销的角色。
- 已验证用户可提交自主入会申请；相同 pending/active 关系重复提交返回当前记录。组织 owner/organizer 可按版本批准或驳回 pending 申请。
- 移除仅允许 active 成员；不能移除组织所有者，也不能通过管理操作移除自己。本人另可退出（所有者须先移交）。成员关系保留历史，离开时同事务撤销组织及其下属赛事/比赛的角色，重新入会不恢复管理角色。
- 审核、移除、退出、撤销邀请必须理由与 expectedVersion；管理端提供二次确认。理由不含凭据或 URL。并发通过组织行锁串行化，成员和邀请版本条件写入、唯一索引兜底。
- 所有读取与写入审计同事务，失败全部回滚；快照只含状态、版本和用户 ID。成员认证/岗位模块尚未实现，后续必须按当前成员关系暂停资格和未完成岗位，不将本期声明为该联动已交付。
- 管理端加载/失败/空状态可区分，失败保留输入，重新读取后才允许冲突操作；离线禁提交、提交互斥、关闭清理私有状态、旧响应不能覆盖新组织。数据仅存内存，API no-store，同源 Cookie/Origin 门禁。

## API

所有路径以 `/api/v1` 为前缀，契约位于 `contracts/organization-members`。

- `GET /organizations/:id/memberships`、`GET /organizations/:id/invitations`：平台审计读取或组织成员管理权限；返回分页数据与 canManage。
- `POST /organizations/:id/invitations`：组织成员管理权限，`{userId,validDays}`。
- `POST /organizations/:id/invitations/:recordId/revoke`：组织成员管理权限，`{expectedVersion,reason}`。
- `GET /me/organization-invitations`：本人邀请分页，不包含其他人的邀请。
- `POST /organizations/:id/invitations/:recordId/accept|decline`：被邀请者本人。
- `POST /organizations/:id/membership-requests`：本人申请。
- `POST /organizations/:id/memberships/:recordId/decision`：组织成员管理权限，`{action:approve|reject|remove,expectedVersion,reason}`。
- `POST /organizations/:id/memberships/:recordId/leave`：成员本人，`{expectedVersion,reason}`。

## 验收记录

- 当前工作区快速测试 66 文件、339 项通过（含并行文件管理模块）；本轮新增成员用例 9 项、HTTP 3 项、管理端状态 4 项、网关 2 项、domain 2 项。`NODE_OPTIONS=--max-old-space-size=256` 限定 heap，未测总 RSS，不声称内存已低于 300 MB。
- 显式独立测试库执行全部数据库检查 13 文件、54 项通过；成员集成 6 项覆盖并发邀请/接受、过期边界、重放、跨组织拒绝、冻结/撤权/账号失效、成员退出/重入和审计回滚；迁移测试覆盖 0007 up/down。各用例使用随机 schema，测试连接池最大 2。
- `pnpm typecheck`、管理端 `type-check`、contracts/domain/API 构建和管理端生产构建通过，`git diff --check` 通过。本地开发库执行 `pnpm dev:api:migrate`，实际应用 0007；生产仍须单独执行迁移及运行账号权限配置。
- 构建前全部 JS 3,467,050 bytes（gzip 1,135,281），构建后 3,499,576 bytes（gzip 1,149,522），CSS 57,322 → 57,452 bytes。构建期间工作区另有文件管理并行改动，差值不能归因于本模块；组织组件和滚动/高度类已进入生产产物。现有 size 脚本首屏闭包统计为 0，未据此宣称首屏为零。
- 浏览器自动连接失败：Chrome 未启用远程调试。因此本轮没有完成真实浏览器的 320px/桌面、Light/Dark、焦点恢复及 reduced-motion 验收；当前仅复用集中主题/减弱动态规则和 Naive UI 模态行为，不把静态检查当作浏览器实测。
- 管理端组织列表仍由平台权限读取；兼具平台与当前组织 owner/organizer 的账号可在该入口写入，纯平台账号为只读。仅有组织角色的账号可通过组织 API 操作，组织工作区导航待后续客户端页面交付。
- 当前没有邮件通知投递；创建成功文案只表达邀请已建立、等待确认，用户可通过本人收件箱 API 获取，裁判端可视回应入口已由 [FS-0027](0027-referee-organizations.md) 交付。

## 交付自检（对应 workflow 清单顺序）

1. 业务 SQL 仅 Repository，路由与 Service 无 SQL。
2. Repository 和事务端口无驱动类型，装配入口注入。
3. 成员/邀请、角色及审计共用事务，无外部 IO；现有事务适配及新增回滚测试通过。
4. 成员和邀请归 organizations，版本、唯一索引、参数化查询和组织行锁兜底，真实迁移/并发验证通过。
5. 新 Vue 组件 81 行，低于 230 行。
6. Vue/Composable 无直接 HTTP 请求。
7. 网关复用无缓存 Cookie 客户端，翻译上下文错误；不涉及直传。
8. 新载荷在 contracts/organization-members 定义。
9. domain 状态转换、成员 Service 和邀请 Service 有用例测试。
10. 固定权限矩阵只有一处，无角色缓存；测试覆盖跨组织、实时撤权及平台不可隐式运营。
11. Naive UI 仅表现层，网关/Composable/domain 不依赖。
12. 私有组件归组织页面，无跨页面引用或额外通用包装。
13. 使用管理端既有集中主题，不新增主题或 token。
14. 表单格式、domain 状态和 API 授权分离；失败保留输入，冲突阻止提交直至重新读取，离线禁写及二次确认有状态测试。
15. 页面 Composable 内存状态，无新 Pinia/持久化。
16. 未新增路由或领域守卫，不适用 Router 修改检查。
17. 类型检查/构建通过；移动/键盘/主题/减弱动态浏览器实测受阻，见上述限制。
18. 新注释解释并发/生命周期意图，无无主 TODO 或死代码。
19. domain 注释说明终态边界，成员 upsert 注释说明保留申请与历史关系；版本和时间含义在规格定义。
20. 自有布局使用管理端现有 Tailwind 3 例外，无新增整页 CSS。
21. 静态工具类，无硬编码主题色、important 或深层穿透。
22. 构建包含成员组件与布局类，产物体积已记录；不将未完成的浏览器验收标为通过。
