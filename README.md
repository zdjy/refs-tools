# 篮球裁判工具平台

移动优先的裁判工具与工作台。产品范围见 [MVP 规格](docs/specs/0001-mvp-scope-and-business-rules.md)，开发规约见[统一索引](docs/agents/coding-standards.md)。

## 本机完整联调：Docker Compose

需要 Docker Engine / Docker Desktop（Linux 容器）和 Docker Compose v2。前端由 Nginx 提供静态文件，不运行 Vite/Node.js 前端服务器；本机无需安装 Node.js 或 pnpm。此配置**仅供本地测试，不是生产部署配置**，依据见 [ADR 0011](docs/decisions/0011-local-compose-environment.md)。

### 首次启动

在仓库根目录执行：

```sh
# PowerShell、Git Bash 均支持；已有 .env 时不要覆盖。
cp .env.example .env
```

编辑 `.env`，替换 `POSTGRES_PASSWORD` 和 `AUTH_CHALLENGE_SECRET` 占位值；后者至少 32 字节。可用密码管理器生成随机值；本机安装了 Node.js 时，也可运行以下命令生成一个值（两个配置分别生成）：

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

然后启动：

```sh
docker compose config --quiet
docker compose up -d --build --wait --wait-timeout 120
docker compose ps -a
```

首次构建需联网下载镜像和包。Compose 自动生成本地证书，等待数据库就绪，运行迁移，再启动 API 和前端。`certificates`、`migrate` 显示 `Exited (0)` 是正常状态，不是启动失败。镜像内使用 Node.js 22 和仓库指定的 pnpm 版本。

### 地址与端口

| 服务 | 本机访问地址 / 端口 | 容器内部 | 用途 |
| --- | --- | --- | --- |
| 前端及同源 API | **https://localhost:8443** | `web:443` | 浏览器测试入口；`/api/` 自动代理至 API |
| API 直连 | http://localhost:3000/api/v1/health | `api:3000` | 健康检查及 API 调试；浏览器认证仍走上面的 HTTPS 同源入口 |
| PostgreSQL 联调库 | `127.0.0.1:5432` | `db:5432` | 数据库 `refs_tools`，用户 `refs_tools`，密码取 `.env` |
| Mailpit 收件箱 | http://localhost:8025 | `mailpit:8025` | 查看测试注册/登录验证码邮件 |
| SMTP | 不发布本机端口 | `mailpit:1025` | API 通过 STARTTLS 发信到本地收件箱，不发送到真实邮箱 |
| PostgreSQL 测试库 | `127.0.0.1:5433` | `test-db:5432` | 仅启用 `test` profile 时启动，独立于联调库 |

所有发布端口只绑定 `127.0.0.1`，默认不允许局域网或手机访问。可在 `.env` 调整 `WEB_PORT`、`API_PORT`、`POSTGRES_PORT`、`MAILPIT_PORT`、`TEST_POSTGRES_PORT`；调整前端端口时 Compose 会同步设置 API 的 `AUTH_PUBLIC_ORIGIN`。浏览器使用 `localhost`，不要替换为 `127.0.0.1`，否则认证写请求的 Origin 校验会失败。

### 本地 HTTPS 与注册登录

首次访问会遇到自签名证书提示。推荐只信任此本地环境的公开证书，不要关闭浏览器或 Node.js 的全局 TLS 校验：

```sh
# 将公开证书导出到仓库外或已忽略的 .cache 目录；不导出私钥。
mkdir -p .cache
docker compose cp api:/certs/local.crt .cache/local.crt
```

Windows PowerShell 中创建目录可用 `New-Item -ItemType Directory -Force .cache`。核对证书来源后，可通过系统证书管理器将其导入**当前用户**的受信任根证书存储，重启浏览器。Windows 也可执行：

```powershell
certutil -user -addstore Root .cache/local.crt
```

该操作会新增本机信任，停止使用后应从证书管理器移除此证书（名称 `refs-tools local development`）；私钥仅保存在 Docker volume，不提交到仓库。证书有效期一年，过期后需在停止服务后删除证书 volume、重新启动并更新本机信任，**不要误删数据库 volume**。API 通过 `NODE_EXTRA_CA_CERTS` 信任本地 SMTP 证书，未放宽 TLS 校验。

打开 https://localhost:8443 注册，使用虚构测试邮箱（例如 `referee@example.test`），到 http://localhost:8025 读取验证码。此收件箱不转发邮件、无访问密码且重建后邮件会丢失，禁止放真实个人数据或在公网暴露。

### 日常操作

```sh
# 修改代码后重新构建并启动；数据库 volume 保留。
docker compose up -d --build --wait
# 查看运行日志，不要公开含测试数据的日志。
docker compose logs --tail=100 api migrate web
# 显式重跑迁移；已应用迁移不会重复执行。
docker compose run --rm migrate
# 停止并移除容器，保留联调数据库及证书。
docker compose --profile test down
```

**只有确认可以清空所有联调数据时**才执行 `docker compose --profile test down -v`；它会同时删除数据库和证书 volume，再次启动后需更新本机证书信任。修改 `.env` 的数据库密码不会自动修改已初始化 volume 中的密码；需显式修改数据库账号密码，或确认数据可丢弃后重建。原有 `referee_*` 容器不属于此 Compose 项目；如它们启动后占用相同端口，先停旧服务或调整 `.env`。

## 自动化测试

### 在 Docker 中运行（无需本机 Node.js）

先完成 `.env` 配置，然后：

```sh
docker compose --profile test build tests
# 快速单测，已包含前端状态和领域测试，不依赖真实 SMTP。
docker compose --profile test run --rm tests pnpm test
# 真实 PostgreSQL 集成测试，自动连接隔离的 test-db。
docker compose --profile test run --rm tests pnpm test:db
```

测试库使用 `refs_tools_test` 数据库和同名用户，密码为固定的本地测试值 `local-test-only`，仅限隔离测试用途；数据放在 tmpfs，容器停止后不保留。测试每次创建随机 schema 并只清理自身 schema，不访问联调库。测试容器限制为 300 MB，V8 heap 为 192 MB；`run --rm` 不会自动停止依赖的测试库，结束后可执行 `docker compose --profile test stop test-db`。

类型检查/构建不属于低内存单测，不要直接在 300 MB 的测试服务内执行。可复用测试镜像，在独立构建检查容器中串行运行：

```sh
docker run --rm --memory=1g -e NODE_OPTIONS=--max-old-space-size=768 refs-tools-local-tests pnpm --recursive --workspace-concurrency=1 run typecheck
docker compose build api web
```

### 在本机运行开发命令

需要 Node.js 22.18+（建议当前 Node.js 22 LTS）及 `package.json` 指定的 pnpm：

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
# Vite 开发服务器默认 http://localhost:5173，/api 代理到 127.0.0.1:3000。
pnpm --filter @refs-tools/referee-web dev
```

`5173` 是 **Vite 开发端口**，不是 Docker 前端端口；端口被占时 Vite 可能递增，以终端输出为准。HTTP Vite 入口适合纯前端调试，**不能替代上述完整 HTTPS 登录联调入口**；认证要求精确 HTTPS Origin 与 Secure Cookie，不能靠改为 HTTP 绕过。

本机运行数据库测试时先启动测试库：

```sh
docker compose --profile test up -d --wait test-db
```

PowerShell：

```powershell
$env:TEST_DATABASE_URL='postgres://refs_tools_test:local-test-only@127.0.0.1:5433/refs_tools_test'
pnpm test:db
```

Git Bash / Linux / macOS：

```sh
TEST_DATABASE_URL=postgres://refs_tools_test:local-test-only@127.0.0.1:5433/refs_tools_test pnpm test:db
```

更改 `TEST_POSTGRES_PORT` 后同步修改上面的 URL。本机 API 的迁移、SMTP 和安全环境变量见[数据库说明](apps/api/db/README.md)及[认证部署说明](apps/api/db/AUTH_DEPLOYMENT.md)；根目录 `.env` 供 Compose 插值，不会被本机 Node.js 进程自动加载。
