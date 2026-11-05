# ADR 0032：裁判端组织入口、成员码、组织角色与候选人检索

- 状态：已接受
- 范围：[FS-0027](../specs/0027-referee-organizations.md)
- 关联：[ADR 0028](0028-organization-members-and-invitations.md)、[ADR 0014](0014-scoped-authorization-and-audit-foundation.md)、[ADR 0025](0025-admin-organization-governance.md)

## 背景

ADR 0028 交付了成员与定向邀请，但用户端没有组织入口：既没有「我的组织」「组织目录」，也不能自助申请创建组织；FS-0002 Task 7 规划的成员码与组织角色授予/撤销尚未实现；邀请只能填用户 UUID，管理者没有办法找到对方。

## 决策

1. **新接口归 organizations 模块，按职责拆为 self / join-codes / roles / candidates 四个 Repository 与 Service**，共用 ADR 0028 的组织行锁与事务装配，不新增缓存或基础设施。
2. **能力由服务端计算后返回**。`GET /me/organizations` 用同一份固定授权矩阵（`permissions.isPermitted`）为每个组织算出 `canManage`、`canGrantRoles` 与有效角色，前端不复制规则；每次写请求仍独立授权。
3. **成员码是凭据**：明文 `rj_` + 32 字节随机数，库内只存 SHA-256 与末 4 位提示；明文只在创建响应出现一次，不进审计、日志或列表。256 位熵使离线哈希碰撞与在线猜测都不可行，因此兑换不额外做限流。兑换流程为：哈希定位组织（无锁）→ 锁组织行 → 单条条件 `UPDATE`（未撤销、未到期、`uses < max_uses`）消费 → 建立 active 成员关系。与创建、撤销的加锁顺序一致，无死锁；`CHECK (uses <= max_uses)` 兜底。未知、撤销、过期、用尽统一返回 `JOIN_CODE_INVALID`，不暴露状态。成员码只授予成员关系，不授予角色。
4. **角色授予仅限组织 owner**，复用 `role.manage` 权限：矩阵中它只授予 owner，平台角色的范围不覆盖组织资源，因此平台管理员与 organizer 都被拒绝。授予/撤销在自己的事务内完成，复用 `auditBinding`，不嵌套 `RoleBindingService`（它会另开事务）。撤销必须校验绑定属于路径中的组织与允许角色，防止跨组织撤销。
5. **自助创建申请**沿用 `organizations` 表的 `pending_review` 状态，申请人即 `owner_user_id`，审核通过前不建立成员关系或角色。同一申请人待审核上限 3 个，用事务级咨询锁（`pg_advisory_xact_lock`）串行化，避免「先查再写」被并发绕过。
6. **候选人检索**是对身份表的只读跨模块投影，因此放在组织模块并说明所有者：需成员管理权限；含 `@` 的关键词只做完整邮箱精确匹配，其余做昵称子串匹配；至少 2 字符、最多 10 条；只返回昵称与 ID 尾号，不返回邮箱；每次检索写审计但不记录关键词。
7. **申请人可撤回 pending 申请**：`membershipStatusAfter('pending','leave')` 返回 `left`，保留历史，之后可重新申请。管理端的 `remove` 仍不适用于 pending。

## 备选方案与后果

- **按用户 ID 邀请**（让被邀请人在账号页复制 ID）：无枚举风险但体验差。用户选择了按昵称/邮箱检索，代价是增加账号枚举面，因此用管理权限、长度下限、条数上限、精确邮箱和审计缓解。**没有独立限流**，若出现滥用须另行增加；当前 2C2G 预算下不引入新的限流存储。
- **成员码明文存库**：便于管理者再次查看，但数据库泄露即等于凭据泄露，拒绝。
- **兑换时区分失败原因**：能给用户更精确的提示，但会让持有人探测码的状态，拒绝。
- **organizer 也可授予角色**：会让组织者自我提权，拒绝。
- **修改共享 `Membership` 契约标注负责人**：会影响管理端，改为在用户端的 `MyOrganization` 增加 `ownerUserId`。

后果：新增迁移 `0009` 与一张表；前端为静态产物，无新增依赖。通知投递、解散、认证联动仍未实现，界面文案如实说明；所有权移交与平台邀请码已由 [ADR 0034](0034-platform-invites-and-ownership-transfer.md) 接续。
