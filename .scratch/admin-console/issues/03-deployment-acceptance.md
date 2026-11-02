# 03：静态部署与首批验收

Status: completed
Blocked by: 01 管理端应用壳与会话；02 平台审计查询
Spec: [FS-0007 第 6–8 节](../../../docs/specs/0007-admin-console.md)

## 交付

Dockerfile 构建管理端，Nginx `/admin/` 子路径回退与指纹资源缓存；README 启动/构建说明；FS-0007 记录实际验证与限制。

## 验收

单测低于 300 MB、typecheck、build、test:styles；320px/桌面、键盘、菜单焦点、reduced-motion、深链接检查。真实环境不可运行须明确记录，不用浏览器替身冒充数据库集成通过。

## Comments

Docker 构建、Nginx 子路径/缓存及匿名 API 检查通过；独立容器不替换现有 8443 服务。内存、浏览器、规约检查及未执行项统一记录于 FS-0007 §8。
