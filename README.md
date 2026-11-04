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

编辑 `.env`，替换 `POSTGRES_PASSWORD`、`AUTH_CHALLENGE_SECRET`、`MINIO_ROOT_PASSWORD`、`S3_SECRET_ACCESS_KEY` 和 `MEDIA_EVENT_SECRET` 占位值；认证及事件密钥至少 32 字节。已有 `.env` 时合并新增存储项，设置 `MEDIA_ENABLED=true`、`MEDIA_STORAGE_PROVIDER=s3`。可用密码管理器分别生成随机值；本机安装了 Node.js 时，也可运行以下命令生成一个值（各配置分别生成）：

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

然后启动：

```sh
docker compose config --quiet
docker compose up -d --build --wait --wait-timeout 120
docker compose ps -a
```

首次构建需联网下载镜像和包。Compose 自动生成本地证书，等待数据库就绪，运行迁移，再启动 API 和前端。`certificates`、`migrate`、`minio-init` 显示 `Exited (0)` 是正常状态，不是启动失败。镜像内使用 Node.js 22 和仓库指定的 pnpm 版本。

### 地址与端口

| 服务 | 本机访问地址 / 端口 | 容器内部 | 用途 |
| --- | --- | --- | --- |
| 裁判端及同源 API | **https://localhost:8443** | `web:443` | 浏览器测试入口；`/api/` 自动代理至 API |
| 管理端 | **https://localhost:8443/admin/** | `web:443` | 与裁判端同源的子路径；平台管理员登录后使用用户管理 |
| API 直连 | http://localhost:3000/api/v1/health | `api:3000` | 健康检查及 API 调试；浏览器认证仍走上面的 HTTPS 同源入口 |
| PostgreSQL 联调库 | `127.0.0.1:5432` | `db:5432` | 数据库 `refs_tools`，用户 `refs_tools`，密码取 `.env` |
| Mailpit 收件箱 | http://localhost:8025 | `mailpit:8025` | 查看测试注册/登录验证码邮件 |
| MinIO 私有对象存储 | https://localhost:9443 | `storage:443` → `minio:9000` | 浏览器签名直传 HTTPS 入口，复用本地证书；媒体不经过 API |
| MinIO 控制台 | http://localhost:9001 | `minio:9001` | 使用 `.env` 中 root 凭据管理合成测试资源 |
| SMTP | `127.0.0.1:1025` | `mailpit:1025` | API 通过 STARTTLS 发信到本地收件箱，不发送到真实邮箱；发布端口供[本机热更新开发](#本机热更新开发日常迭代)中的宿主机 API 使用 |
| PostgreSQL 测试库 | `127.0.0.1:5433` | `test-db:5432` | 仅启用 `test` profile 时启动，独立于联调库 |

所有发布端口只绑定 `127.0.0.1`，默认不允许局域网或手机访问。可在 `.env` 调整 `WEB_PORT`、`API_PORT`、`POSTGRES_PORT`、`MAILPIT_PORT`、`TEST_POSTGRES_PORT`、`MINIO_PORT`、`MINIO_CONSOLE_PORT`；调整前端端口时 Compose 会同步设置 API 的 `AUTH_PUBLIC_ORIGIN`。浏览器使用 `localhost`，不要替换为 `127.0.0.1`，否则认证写请求的 Origin 校验会失败。

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

### 资源存储

本地资源管理使用固定版本 `pgsty/minio`，自动创建私有 Bucket 和受限媒体账号，数据持久化在 `objects` volume。浏览器使用短时签名直接上传/下载，API 仅负责权限、元数据与完成核验。上传部件仍需由具体业务页面接入，启用存储不代表新增了独立资源管理页面。

上线通过 `MEDIA_STORAGE_PROVIDER=oss` 切换现有阿里云 OSS 适配器，或用 `s3` 配置兼容云存储；正式部署不使用这套本地 MinIO。切换配置不会自动迁移文件，已有媒体须先迁移与核验。变量、权限、清理和迁移步骤见[媒体部署说明](apps/api/db/MEDIA_DEPLOYMENT.md)，取舍见 [ADR 0024](docs/decisions/0024-local-minio-and-cloud-storage-switch.md)。

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

**只有确认可以清空所有联调数据时**才执行 `docker compose --profile test down -v`；它会同时删除数据库、证书和对象存储 volume，再次启动后需更新本机证书信任。修改 `.env` 的数据库密码不会自动修改已初始化 volume 中的密码；需显式修改数据库账号密码，或确认数据可丢弃后重建。原有 `referee_*` 容器不属于此 Compose 项目；如它们启动后占用相同端口，先停旧服务或调整 `.env`。

## 本机热更新开发（日常迭代）

改代码即可在浏览器看到最新程序，不需要重建镜像：API 在宿主机用 `tsx watch` 运行，裁判端与管理端用 Vite 开发服务器，PostgreSQL、Mailpit、MinIO 等基础设施仍由 Compose 提供。浏览器入口仍是 **https://localhost:8443**，与 Compose 入口同源，因此认证 Origin 校验、`__Host-` 会话 Cookie 和对象存储 CORS 都不需要放宽。取舍与备选方案见 [ADR 0026](docs/decisions/0026-local-hot-reload-dev-environment.md)。

前提：本机安装 Node.js 20.19+、pnpm 12、Docker Engine / Docker Desktop，以及 `openssl`（Git for Windows 自带）。

```sh
# 仅首次：安装依赖、配置本地密钥
pnpm install
cd apps/admin-web && pnpm install --frozen-lockfile --ignore-scripts && cd ../..
cp .env.example .env                                  # 已有 .env 时不要覆盖

# 仅首次：生成开发证书（本地 CA + localhost 叶子证书）并信任其中的 CA
pnpm dev:cert
certutil -user -addstore Root ".cache/dev-certs/ca.crt"

# 日常：一条命令即可（重启电脑后也是这一条）
pnpm dev
```

`pnpm dev` 会先确认基础设施容器就绪（`db`、`mailpit`、`minio`、`minio-init`、`storage`、`certificates`，已运行则秒过），再启动 API、裁判端与管理端；`api`、`web` 容器不启动，避免与宿主机进程抢 3000/8443 端口。只想重启三个开发进程、不碰容器时用 `pnpm dev -- --no-infra`；只起容器用 `pnpm dev:infra`。

数据库迁移不在 `pnpm dev` 里自动执行：新增或修改迁移后单独运行 `pnpm dev:api:migrate`。

| 地址 | 内容 |
| --- | --- |
| https://localhost:8443/ | 裁判端，保存即热更新 |
| https://localhost:8443/admin/ | 管理端，经裁判端 Vite 代理后与裁判端同源 |
| http://localhost:3000/api/v1/health | 宿主机 API，保存后自动重启 |
| http://localhost:8025 | Mailpit 收件箱 |

- 前端保存后由 Vite HMR 局部更新，API 保存后由 `tsx watch` 重启；数据库结构变更需重新执行 `pnpm dev:api:migrate`。
- 从 Compose 联调模式切回开发模式前先执行 `docker compose stop api web`；`pnpm dev` 发现 3000、8443、8001 被占用会直接报错退出，不静默换端口（常见原因是上一次的 `pnpm dev` 窗口没关）。
- 真实登录只在 `https://localhost:8443` 成立。`http://localhost:5173`、`http://localhost:8001` 或局域网地址既不受开发证书覆盖，也不匹配 `AUTH_PUBLIC_ORIGIN`，只能用于不依赖登录的页面调试。
- 开发证书由 `.cache/dev-certs/ca.crt`（本地 CA，10 年）签发 `localhost.crt`（叶子证书，1 年），浏览器只信任 CA。`pnpm dev:cert -- --force` 只重签叶子证书、不需要重新导入信任；`pnpm dev:cert -- --new-ca` 才轮换 CA（需重新导入）。重新生成证书后必须重启 `pnpm dev`，并**完全退出浏览器再打开**，因为 Chrome 会缓存该主机的证书错误。停用后执行 `certutil -user -delstore Root "refs-tools local dev CA"` 移除信任。私钥只保存在已忽略提交的 `.cache/`，不进入镜像或仓库。
- API 读取根 `.env` 中的本地密钥，只把容器主机名换成 `127.0.0.1`，不复制密钥文件；`NODE_EXTRA_CA_CERTS` 指向从 Compose 容器复制的公开证书，SMTP 与对象存储仍完整校验 TLS。
- 需要验收镜像产物（Nginx 静态托管、容器网络、生产构建）时，仍使用上一节的 `docker compose up -d --build --wait`。

## 上游模板快照

`apps/admin-web` 完整保留 [jekip/naive-ui-admin](https://github.com/jekip/naive-ui-admin) 的 `main` 分支源码，版本 `3.0.0`，commit `c9db4cde447240eaa17fbe439f507680819add3d`；MIT 许可、上游 README、锁文件、示例和 Mock 均保留。本地只修改 UI 颜色，使用[共享 UI 规范配色](docs/ui/macos_fiba.md)，不改布局、字体、尺寸、路由、登录逻辑或构建配置。

该快照独立安装和构建，不纳入根 pnpm 工作区（自带锁文件与 `.npmrc`）；不对上游执行 Tailwind 4 迁移或组件拆分。真实登录、会话恢复与用户管理已接入本项目 API（见 [ADR 0022](docs/decisions/0022-admin-user-crud-and-cookie-boundary.md)），其余模板页面仍使用上游 Mock。Docker Compose 会随 `web` 镜像构建并部署管理端到 `/admin/`，依据见 [ADR 0011](docs/decisions/0011-local-compose-environment.md) 的后续实施。

```sh
cd apps/admin-web
# 禁用上游 Husky 安装脚本，避免改写外层仓库的 Git hooks。
pnpm install --frozen-lockfile --ignore-scripts
pnpm dev          # http://localhost:8001/，默认使用上游 Mock
pnpm type-check
pnpm build
```

**登录账号**：管理端没有内置账号。先在裁判端 `https://localhost:8443/register` 注册并验证邮箱，再按 [AUTHORIZATION_AUDIT.md](apps/api/db/AUTHORIZATION_AUDIT.md) 的“首个平台管理员”流程授权，之后在 `https://localhost:8443/admin/login` 用邮箱和密码登录。

`pnpm dev` 的 `http://localhost:8001/admin/` 没有 `/api` 代理，只能浏览 Mock 页面，不能真实登录；真实登录使用 `https://localhost:8443/admin/`（见[本机热更新开发](#本机热更新开发日常迭代)与 Compose 入口）。根目录 `pnpm test` 会运行管理端 `test/` 下的单测，但根目录 `pnpm typecheck` 不覆盖管理端，需在 `apps/admin-web` 内运行 `pnpm type-check`。

## 前端样式

现有导航、认证/账号、404 和队伍级记录台已迁移至 Tailwind CSS，保留全局可访问性基线及品牌几何裁切，不启用 Preflight。范围与验收见[迁移规格](docs/specs/0004-tailwind-migration.md)，选型及兼容性取舍见 [ADR 0013](docs/decisions/0013-tailwindcss-styling.md)；工程约束统一遵循[样式规约](docs/agents/coding-standards/styles.md)，视觉基线仍为[共享 UI 规范](docs/ui/macos_fiba.md)。

独立样式构建检查：`pnpm --filter @refs-tools/referee-web test:styles`，不并入低内存单测。

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

更改 `TEST_POSTGRES_PORT` 后同步修改上面的 URL。本机 API 的迁移、SMTP 和安全环境变量见[数据库说明](apps/api/db/README.md)及[认证部署说明](apps/api/db/AUTH_DEPLOYMENT.md)；根目录 `.env` 供 Compose 插值，`pnpm dev` 会读取它并为宿主机 API 改写主机名（见 [ADR 0026](docs/decisions/0026-local-hot-reload-dev-environment.md)）。
