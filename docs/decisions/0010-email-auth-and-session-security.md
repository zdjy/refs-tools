# ADR 0010：邮箱验证、密码与会话安全

- 状态：已接受
- 日期：2026-11-02
- 范围：FS-0002 Task 3、ticket 01

## 背景

ADR 0004 已选择 PostgreSQL 服务端会话。Task 3 需要可部署的邮箱投递、跨进程频控、一次性 challenge 和可撤销 Cookie；FS-0002 旧版 Bearer/accessToken 描述与该决策不一致，以 ADR 0004 的 Cookie 方案为准并同步规格。

## 决策

- 新认证契约使用规约要求的 TypeBox JSON Schema；保留已有通用 Zod 契约，避免本任务扩大为全库迁移。新增 `@sinclair/typebox`，由 Schema 推导 DTO。
- 邮件使用 Nodemailer SMTP adapter（TLS、有限连接/响应超时、禁用调试日志），避免自行实现 SMTP/TLS/MIME。只在事务提交后发送，不持久化明文验证码；投递失败使 challenge 失效并返回通用临时失败。短信仅保留 provider 端口。
- 邮箱去除首尾空格并统一小写，数据库唯一约束兜底；不自动合并账号。验证码使用 CSPRNG 六位数字、HMAC-SHA256（独立部署密钥及 challenge ID），数据库只保存摘要。挑战绑定用途；事务内锁定并累计失败次数，失败结果在提交后转为业务异常，避免回滚抹去次数。过期、耗尽和重放统一失败。
- 发送和密码登录按 IP、邮箱在 PostgreSQL 固定时间窗原子计数；不信任转发头。部署可调整 TTL、时间窗、上限、密码长度和会话期限。过期频控记录可通过维护命令清理。
- 密码使用 Node.js 异步 scrypt（N=16384、r=8、p=1，随机 16 字节盐、64 字节派生密钥）。API 进程最多并行两次密码运算，超出返回 503，避免 2C2G 主机无界内存排队；未知账号也执行相同 KDF，登录失败统一响应。
- 会话 token 使用 32 字节随机值，仅 SHA-256 摘要落库。每次读取重新核验账号 active、会话未撤销且未过期。Cookie 固定为 `__Host-refs_session; Secure; HttpOnly; SameSite=Lax; Path=/`，不返回 accessToken，不写默认缓存。
- 认证写接口强制精确匹配部署的 `AUTH_PUBLIC_ORIGIN`，包含匿名注册/登录以防 login CSRF；Cookie 只用于同源静态 SPA/API。请求体上限 8 KiB。受保护核心操作复用服务端邮箱验证门禁。会话查询与注销为 Task 3 的新增接口；密码修改要求当前已登录用户对自身邮箱完成 password 用途 challenge，成功后撤销旧会话并签发新会话。
- 本次不实现凭据合并审批（需要 Task 4 审计及后续人工后台），重复凭据明确拒绝。

## 备选方案与后果

JWT 仍不能满足即时撤销；进程内频控不能覆盖多进程；自写 SMTP 增加协议与安全成本；引入 Redis 不符合当前资源预算。PostgreSQL 多两类短期记录，需要有界定期清理。SMTP 是外部依赖，测试仅使用 provider 替身；生产需配置 TLS SMTP、Origin 和独立密钥，禁止退化为日志输出验证码。默认 TTL/限额是可配置起点，具体见认证部署说明。
