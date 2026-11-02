# 认证部署配置

认证 API 使用 PostgreSQL 服务端会话和邮箱 SMTP 投递。生产环境必须通过部署系统注入以下配置，不要把密钥写入仓库、日志或客户端。

## 必需配置

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL`（或 `PG*`） | PostgreSQL 连接配置；先执行 `pnpm --filter @refs-tools/api db:migrate`。 |
| `AUTH_CHALLENGE_SECRET` | 至少 32 字节的随机部署密钥，用于验证码 HMAC；不同环境必须不同。 |
| `AUTH_PUBLIC_ORIGIN` | 精确的 HTTPS Origin，例如 `https://refs.example.com`，不要包含路径或末尾 `/`。 |
| `SMTP_HOST` | SMTP 服务地址。 |
| `SMTP_FROM` | 已获授权的发件人地址。 |

SMTP 默认使用 465 端口的隐式 TLS；设置其他端口时仍强制 STARTTLS。若 SMTP 需要认证，必须同时设置 `SMTP_USER` 和 `SMTP_PASSWORD`，两者不能只配置一个。连接、握手和 socket 超时均有上限，调试日志关闭。

## 可选策略

认证策略可以通过 `AUTH_` 加字段名配置，例如 `AUTH_CHALLENGE_TTL_SECONDS`、`AUTH_SEND_EMAIL_LIMIT`、`AUTH_LOGIN_IP_LIMIT`、`AUTH_SESSION_TTL_SECONDS` 和 `AUTH_PASSWORD_MIN_LENGTH`。所有值必须是正整数，密码最小长度不能超过 128；默认值见 `apps/api/src/modules/auth/auth.config.ts`。

## 运行与维护

```sh
pnpm --filter @refs-tools/api db:migrate
pnpm --filter @refs-tools/api auth:cleanup
pnpm --filter @refs-tools/api start
```

`auth:cleanup` 应由外部调度器按需运行，按有限批次删除已过期的邮箱 challenge、会话和频控记录。API 运行账号不应拥有迁移所需的 DDL 权限。生产前应确认 Nginx/API 使用同一 HTTPS Origin，并确保浏览器能够向 API 发送同源 Cookie。

会话 Cookie 名称为 `__Host-refs_session`，仅包含 `HttpOnly; Secure; SameSite=Lax; Path=/` 属性。注销和密码更新会撤销服务端会话；客户端不应把 Cookie、验证码、密码或响应中的任何认证凭据写入 localStorage、IndexedDB 或日志。
