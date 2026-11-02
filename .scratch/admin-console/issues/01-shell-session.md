# 01：管理端应用壳与会话

Status: completed
Blocked by: 无，可立即开始
Spec: [FS-0007 ADM-01/03](../../../docs/specs/0007-admin-console.md)

## 交付

- `apps/admin-web` 独立构建、FIBA 主题、响应式导航、静态懒加载路由与 404。
- `src/api/auth.api.ts`、`application/session-state.ts`、`stores/session.ts`、`views/login/`；Cookie 会话恢复、密码登录、退出；无 Token 持久化。
- 工作台与待接入模块说明，无模拟业务列表/计数/批准操作。

## 验收

会话 401/网络失败区分；退出失败保留登录态；退出成功销毁业务视图；登录字段错误关联标签并聚焦。路由、会话状态、生产构建测试通过。

## Comments

首批实现和验证见 FS-0007 §8；真实 API 授权登录待受控测试账号验收。
