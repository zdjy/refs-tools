# 作用域授权与审计部署/接入

范围为 [FS-0002 Task 4](../../../docs/specs/0002-mvp-platform-feature.md#task-4作用域-rbac-与审计基础设施)，取舍见 [ADR 0014](../../../docs/decisions/0014-scoped-authorization-and-audit-foundation.md)。本次不包含 Task 7/15 的组织、成员或赛事管理接口。

## 迁移与后续表扩展

执行 `pnpm --filter @refs-tools/api db:migrate` 应用 `0003`。它建立角色、审计，以及组织/成员/赛事/比赛的归属和状态骨架。Task 7/15 用新增迁移补齐业务字段，不改写本迁移、不重复建表。当前不能把骨架当作可运营业务模块。

`db:rollback` 的 down 会销毁本任务的数据和骨架，只适用于未投产环境或经批准的恢复流程；投产后需先按部署留存策略备份和审批，不能以回滚代替审计清理。

## 运行凭据最小权限

迁移账号与 API 账号分离。API 账号必须为非超级用户、无 CREATEROLE/DDL，不拥有业务 schema、表或触发器；禁止继承迁移所有者角色。部署时由所有者针对实际 schema/账号授权，示例占位符为 `app_schema`、`api_runtime`：

```sql
GRANT USAGE ON SCHEMA app_schema TO api_runtime;
GRANT SELECT, INSERT, UPDATE ON app_schema.users, app_schema.email_challenges,
  app_schema.auth_sessions, app_schema.auth_rate_limits, app_schema.role_bindings TO api_runtime;
-- FOR SHARE 需要 UPDATE 权限；骨架业务写入口仍未开放。
GRANT SELECT, UPDATE ON app_schema.organizations, app_schema.organization_memberships,
  app_schema.events, app_schema.matches TO api_runtime;
REVOKE ALL ON app_schema.audit_events FROM api_runtime;
GRANT SELECT, INSERT ON app_schema.audit_events TO api_runtime;
```

不要为方便使用 `GRANT ALL ON ALL TABLES`；不得向 API 账号授予审计 UPDATE/DELETE/TRUNCATE、表所有权或关闭触发器的权限。认证维护任务的清理账号与所需 DELETE 权限仍按[认证部署说明](AUTH_DEPLOYMENT.md)独立配置。本机 Compose 的数据库所有者账号仅用于开发，不是生产权限模板。

## 首个平台管理员

先通过正常邮箱注册建立经验证账号，再由部署负责人用迁移/维护身份在短事务中初始化。下列 psql 参数 `user_id`、`binding_id`、`audit_id` 均须由受控操作显式提供；不包含密码、邮箱、验证码或 Cookie，且不能作为开放 API 执行：

```sql
BEGIN;
INSERT INTO role_bindings
  (id,subject_user_id,role,scope_type,scope_id,granted_by,starts_at)
SELECT :'binding_id'::uuid,id,'platform_admin','platform',NULL,id,now()
FROM users WHERE id=:'user_id'::uuid AND status='active' AND email_verified_at IS NOT NULL;
INSERT INTO audit_events
  (id,actor_user_id,action,resource_type,resource_id,scope_type,scope_id,after)
SELECT :'audit_id'::uuid,subject_user_id,'role.granted','role_binding',id,'platform',NULL,
  jsonb_build_object('role',role,'subjectUserId',subject_user_id,'scopeType','platform','scopeId',NULL,'status','active')
FROM role_bindings WHERE id=:'binding_id'::uuid;
COMMIT;
```

操作方必须确认两个 INSERT 各新增一条；零行说明账号不符合条件，不应视为自举完成。后续授予/撤销使用受控 `RoleBindingService`；本次尚未提供平台角色管理 HTTP。组织 owner 的初始建立/转移留给 Task 7 专用事务，不使用通用角色授予方法。

## API 验收入口

- `GET /api/v1/admin/audit-events`：当前 `platform_admin`，可按 `scopeType/scopeId/resourceType/resourceId` 筛选。
- `GET /api/v1/organizations/{orgId}/audit-events`：该组织当前有效 owner + active membership，仅返回本组织及下属赛事/比赛日志。
- 查询支持 `cursor` UUID 和 `limit`（1–100，默认 50），返回 `{data:{items,nextCursor}}`。摘要不返回 before/after，响应 `Cache-Control: no-store`。
- 使用既有 `__Host-refs_session` Cookie。未登录为 401；无平台权限为 403；组织不可见与不存在统一 404。撤销绑定/退出成员关系后相同 Cookie 的下一次请求立即失权。
- frozen/dissolved 组织仅允许仍有绑定/成员关系的负责人读取历史审计，不允许运营。成功查询本身也追加审计；查询条件不是授权依据。

## 后续用例接入

- 业务端点先从现有服务端会话取得 user ID；需要邮箱验证的写操作沿用 `requireVerifiedSession`，不可接受客户端声明 actor、角色或父级归属。
- 在业务事务的同一 Repository 集合中注入 `authorization` 和 `audit`。使用 `requirePermission` 检查服务端资源归属，再执行业务状态机和版本检查、写业务数据、调用 `appendAudit`。
- 独立 `AuthorizationService.require` 仅用于只读门禁。不得在事务外先授权，再另开事务修改。也不得在已有事务内调用会另开事务的 `RoleBindingService`；跨模块创建 owner 等原子用例需显式复用当前上下文。
- `appendAudit` 只接受受限状态/版本/角色/UUID 投影。不传整行、用户材料、媒体内容、请求/异常对象或 URL。reason 应为最小化的操作说明；标记拦截并不能识别所有自由文本秘密。
- 通用角色授予支持平台角色、organization-scoped organizer/certifier、event/match-scoped head_referee。scope/角色不合法返回 422，已有未撤销相同绑定返回 409（即使已过期也要先撤销），重复撤销幂等。组织者仅能委派 head_referee，不能授予其他组织角色。
- 考试范围、自审回避、报名资格、对象媒体授权及完整业务状态机由所属模块继续检查；平台管理员不自动获得组织者、裁判长、grader 或 certifier 权限。

## 测试

`pnpm test` 执行纯 policy、Service 与现有快测；显式设置独立 `TEST_DATABASE_URL` 后执行 `pnpm test:db`，验证真实 scope 查询、并发授予、审计原子回滚、不可变限制、分页及真实 Cookie HTTP。

审计最小权限验证会创建一个随机 NOLOGIN 测试角色、授予当前隔离 schema 的 SELECT/INSERT，并在 finally 中清除；因此完整数据库验收账号除创建 schema 外还需 CREATEROLE 和 SET ROLE 能力，仅用于专用测试数据库（本机 Compose `test-db` 满足），不要赋予生产 API 账号这些能力。
