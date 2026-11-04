# ADR 0026：本机热更新开发环境（Vite 开发服务器 + 宿主机 API）

- 状态：已接受
- 日期：2026-11-04
- 范围：本机日常开发；不改变生产部署、Compose 联调入口与任何认证安全边界

## 背景

[ADR 0011](0011-local-compose-environment.md) 的 Compose 入口用 Nginx 提供静态产物，改一行前端源码也要重建镜像；API 同样只在镜像里运行。裁判端与管理端的 Vite 开发服务器虽然保留，但只能以 `http://localhost:5173`、`http://localhost:8001` 访问，无法完成真实注册登录：

- 认证对写请求执行精确 Origin 校验（`AUTH_PUBLIC_ORIGIN`），`http://localhost:5173` 会被拒绝为 `ORIGIN_REJECTED`（实测 403）。
- 会话 Cookie 名为 `__Host-refs_session`，前缀要求 Secure 与 HTTPS 源，明文 HTTP 入口无法写入。
- 对象存储入口的 CORS 只允许 `https://localhost:8443`，明文开发源无法直传。
- 启动装配要求 `AUTH_PUBLIC_ORIGIN` 为精确 HTTPS 源。

因此需要在不放宽上述边界的前提下，让「保存即生效」的开发体验与真实认证链路同时成立。

## 决策

浏览器入口固定为 **`https://localhost:8443`**，由裁判端 Vite 开发服务器直接提供 HTTPS：

1. `scripts/dev-cert.mjs` 用 `openssl` 生成仅本机使用的自签名证书到 `.cache/dev-certs/`（已忽略提交，私钥不出本机、不进 Docker volume）。开发者一次性把公开证书导入当前用户根证书存储，可随时移除。
2. `apps/referee-web/vite.config.ts` 在检测到该证书时以 `https` + `port 8443` + `strictPort` 启动，并把 `/api` 代理到 `http://127.0.0.1:3000`、`/admin` 代理到管理端开发服务器 `http://127.0.0.1:8001`（含 WebSocket）。端口被占用时直接失败，避免静默换端口导致 Origin 校验失败。
3. 管理端开发服务器改用与生产一致的 `VITE_PUBLIC_PATH=/admin/`，经上述代理后与裁判端同源，Cookie 会话共用；也可单独访问 `http://localhost:8001/admin/` 调试不依赖登录的页面。
4. `scripts/dev-api.mjs` 在宿主机用 `tsx watch` 运行 API：读取根 `.env` 的本地密钥，仅把容器主机名改写为 `127.0.0.1`（数据库、Mailpit SMTP、对象存储），不复制密钥文件、不改认证代码。`NODE_EXTRA_CA_CERTS` 指向从 Compose 容器复制到 `.cache/` 的公开证书，SMTP STARTTLS 与对象存储 TLS 仍完整校验。
5. 对象存储仍走已发布的 `https://localhost:9443`，`S3_ENDPOINT` 与 `S3_PUBLIC_ENDPOINT` 相同，签名 Host 与浏览器一致。
6. `compose.yaml` 为 Mailpit 增加回环绑定的 SMTP 发布端口（`MAILPIT_SMTP_PORT`，默认 1025），供宿主机 API 投递验证码邮件；容器内仍用 `mailpit:1025`。
7. `scripts/dev.mjs` 编排三个进程（API、裁判端、管理端），统一加日志前缀并在 Ctrl+C 时结束全部子进程；`pnpm dev:infra` 只启动基础设施容器。

开发模式下不启动 `web`、`api` 容器（8443/3000 与宿主机进程冲突），基础设施（`db`、`mailpit`、`minio`、`minio-init`、`storage`、`certificates`）继续由 Compose 提供。

## 备选方案

- **开发期放宽认证边界**（允许 `http://localhost` 源、去掉 Cookie 的 `Secure`）：前端改动最小，但直接推翻 ADR 0011「拒绝 HTTP 前端」的结论，并让 CSRF 防护与 `__Host-` 前缀语义在开发期失效，难以保证开发与生产行为一致。拒绝采用。
- **复用 Compose 证书**：可少信任一张证书，但需要把 Docker volume 里的私钥导出到宿主机，违反「私钥只留在 volume」的既有约束，且开发证书与联调证书的轮换互相牵连。拒绝采用。
- **开发服务器跑在容器内 + bind mount**：不需要宿主机 Node.js，但 Windows 上的文件监听不可靠，且失去本机调试与即时重启。拒绝采用。
- **额外 TLS 反向代理容器**（Nginx 终止 TLS 再转发到宿主 Vite）：能复用 Compose 证书，但新增容器、需要 `host.docker.internal` 与额外 Host 白名单配置，比直接让 Vite 提供 HTTPS 更复杂。暂不采用。
- **两个前端各占独立端口**：Cookie 不区分端口但 Origin 校验区分，管理端写请求仍会失败，必须同源。拒绝采用。

## 后果与限制

- 前端改动走 HMR，API 改动由 `tsx watch` 自动重启；数据库迁移用 `pnpm dev:api:migrate` 在宿主机执行。
- 开发证书与 Compose 证书相互独立：切换两种模式时浏览器各自需要信任对应证书；开发证书有效期一年，可 `pnpm dev:cert -- --force` 重新生成。
- 真实登录只在 `https://localhost:8443` 成立。开发服务器仍绑定全部网卡便于手机预览页面，但局域网地址既不受开发证书覆盖，也不匹配 `AUTH_PUBLIC_ORIGIN`，不能用于认证流程。
- 宿主机需要 Node.js、pnpm 与 `openssl`（Git for Windows 自带）；Compose 完整联调仍不依赖宿主机工具链。
- 本机 API 连接池上限仍为 5，与 Compose 一致；不新增运行时依赖，不改变生产镜像、迁移、认证与授权代码。
