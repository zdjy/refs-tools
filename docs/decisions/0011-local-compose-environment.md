# ADR 0011：本机完整联调的 Docker Compose 环境

- 状态：已接受
- 日期：2026-11-02
- 范围：本地开发、手工联调及自动化数据库测试；不作为生产部署方案

## 背景

仓库已有静态 Vue SPA、Fastify API、PostgreSQL 迁移和认证，但缺少可复用的容器配置。认证要求 HTTPS 同源 Origin、Secure Cookie 和 TLS SMTP，仅提供数据库容器或 HTTP 前端会使注册登录联调失败。需要不依赖宿主机 Node.js、且不修改现有安全边界的完整环境。

## 决策

根目录新增 `compose.yaml` 和多阶段 `Dockerfile`。使用 Node.js 22 构建及运行 API，沿用仓库 pnpm 版本和 frozen lockfile；前端编译产物由 Nginx 直接提供，不运行 Node.js 前端服务器。PostgreSQL 采用 17 Alpine 镜像，新 volume 与旧容器分离，不复用 PostgreSQL 15 的数据目录，不在此任务中做版本迁移。

服务启动顺序为：生成证书、数据库健康检查、一次性迁移、Mailpit 健康检查、API 健康检查、Nginx。迁移使用独立容器执行，不放入 API 请求或启动逻辑。联调账号为本地便利兼有迁移权限，生产必须按既有部署要求拆分 DDL 和业务账号。

Mailpit 作为仅本地使用的邮件收件箱，不向外投递。OpenSSL 一次性生成覆盖 `localhost`、`127.0.0.1`、`mailpit` 的自签名证书，保存在 Docker volume；Nginx 提供 HTTPS，Mailpit 强制 STARTTLS，API 通过 `NODE_EXTRA_CA_CERTS` 增量信任证书，不关闭 TLS 校验。浏览器需由开发者显式信任公开证书，并在不再使用时移除信任。

所有发布端口仅绑定回环地址。数据库密码与 challenge 密钥由忽略提交的 `.env` 提供，仓库只保留占位模板。默认端口及操作步骤统一维护在[根 README](../../README.md)。联调 PostgreSQL 配置有界连接和保守内存参数，API 连接池上限为 5，常驻容器设置内存上限；构建资源不计入生产运行预算。

自动化测试通过 `test` profile 使用独立 PostgreSQL 数据库容器和 tmpfs，不复用持久化联调库。测试容器内存上限 300 MB、V8 heap 192 MB；类型检查和镜像构建不套用单测内存预算，需在独立构建环境执行。无业务规则、API 契约、认证代码或数据库迁移变更。

## 备选方案

- 只提供数据库 Compose：更轻，但不满足无需宿主工具链的完整联调要求。
- HTTP 前端、明文 SMTP 或关闭证书验证：配置简单，但偏离现有认证安全边界，拒绝采用。
- Caddy / 额外代理 / Redis / 对象存储模拟器：当前 Nginx 足以满足静态托管与同源代理；其余组件无本任务需求，不新增。
- 使用真实 SMTP：可用于独立环境，但依赖外部凭据、产生真实邮件，不适合作为默认本地测试方案。

## 后续实施：管理端同源部署于 /admin/

[ADR 0022](0022-admin-user-crud-and-cookie-boundary.md) 让管理端接入真实 Cookie 会话后，需要在同一套 Compose 内联调。认证强制精确匹配单个 `AUTH_PUBLIC_ORIGIN`，Cookie 不区分端口，因此管理端不使用独立端口或子域，而是与裁判端同源，部署在 `/admin/` 子路径：

1. `web` 镜像增加独立的管理端构建阶段（管理端不在 pnpm workspace 内，自带锁文件），产物放入 `/usr/share/nginx/html/admin`。生产构建的 `VITE_PUBLIC_PATH` 为 `/admin/`，路由 `createWebHistory(import.meta.env.BASE_URL)`。
2. Nginx 为 `/admin/` 配置独立的静态资源缓存与 SPA 回退，`/admin` 重定向到 `/admin/`，并关闭绝对重定向以保留宿主映射端口。
3. 同源共享 localStorage：管理端 `Storage` 使用 `ADMIN__` 前缀，`clear()` 仅清理该前缀，避免模板的整体清理删除裁判端的本地工作台数据。
4. `.dockerignore` 放行 `apps/admin-web/build`（Vite 构建脚本源码）和 `.env.production`（仅含公开构建参数）。

本机 `pnpm dev` 的 `8001` 入口没有 API 代理且 Origin 不匹配，不能用于真实登录；真实登录使用同源入口（Compose 的 `https://localhost:8443/admin/`，或[热更新开发环境](0026-local-hot-reload-dev-environment.md)中经裁判端 Vite 代理的同一地址）。

## 后续实施：本地对象存储

[ADR 0024](0024-local-minio-and-cloud-storage-switch.md) 按资源联调需求新增固定版本 `pgsty/minio`、一次性私有 Bucket/账号初始化及独立 HTTPS 存储入口；更新本 ADR 原先不新增存储模拟器的范围。启动 API 前等待初始化与存储入口健康，数据保存在独立 `objects` volume。生产继续使用第三方云存储，不部署此本地组件。

## 后果与限制

- 一条 Compose 启动命令可重复执行迁移并联调注册登录，旧 `referee_*` 容器不被修改。
- 本地收件箱无鉴权，账号权限、证书和回环绑定均为本机测试假设，禁止直接用于公网部署或存储真实敏感数据。
- 证书有效期一年，更新需停止服务、单独重建证书 volume 并更新宿主信任；删除全部 volume 会清空联调数据。
- 静态前端没有热更新，修改源码后需重建镜像；Vite 本机开发入口继续保留，但不自动具备完整 HTTPS 登录环境。日常迭代改用[本机热更新开发环境](0026-local-hot-reload-dev-environment.md)：Vite 开发服务器直接提供 `https://localhost:8443` 同源入口，API 在宿主机 `tsx watch` 运行，本 ADR 的 Compose 入口继续用于验收镜像产物。
- 镜像基线采用版本/发行线标签而非 digest，构建需联网；后续生产发布需独立制定镜像固定、安全更新、密钥、备份和 TLS 方案。
