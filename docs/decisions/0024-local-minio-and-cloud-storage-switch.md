# ADR 0024：开发阶段使用 pgsty/minio，上线切换云对象存储

- 状态：已接受
- 日期：2026-11-04
- 关联：[ADR 0005](0005-object-storage-provider.md)、[ADR 0011](0011-local-compose-environment.md)、[ADR 0021](0021-media-control-plane.md)
- 范围：替代 ADR 0005/0021 在开发阶段必须使用阿里云 OSS 的限制；生产媒体仍按 ADR 0002 使用第三方存储。

## 背景

资源管理需要先在无云账号的环境验证私有媒体直传，用户指定使用 `pgsty/minio`。已有控制面通过 `ObjectStorage` 端口隔离供应商，业务数据保存 object key，不保存 URL，因此可以增加供应商适配而不改写媒体状态机。

## 决策

- 本地 Compose 使用 `pgsty/minio:RELEASE.2026-08-04T00-00-00Z`，数据写入独立 `objects` volume。该版本已核验存在 amd64/arm64 镜像且包含 `mcli`。上游后续更名为 `pgsty/silo`，本次遵从指定镜像并固定版本，不跟随 `latest` 隐式升级。
- `MEDIA_STORAGE_PROVIDER=s3|oss` 显式选择适配器。Compose 默认 s3、开启媒体；未指定供应商的独立 API 继续采用 oss，兼容既有部署。开关关闭时不注册媒体路由；错误供应商或缺失配置必须阻止启动。
- S3 适配器采用模块化官方 `@aws-sdk/client-s3` 与 `@aws-sdk/s3-request-presigner`。MinIO SDK 的便捷 PUT 签名接口不便表达本项目必须签入的 Content-Type 与条件写头，因此不自行实现签名。SDK 仅进入 API，存储网络连接上限 4、超时 5 秒、最多 2 次尝试。
- S3 上传签名绑定精确 key、Content-Type、媒体/owner 元数据及 `If-None-Match: *`，阻止已核验对象被覆盖。读取保持 attachment/no-store。HEAD、删除走 `S3_ENDPOINT`，浏览器签名走 `S3_PUBLIC_ENDPOINT`；签名后不得替换 Host 或重写路径。全部沿用现有 TTL、权限、配额和 HEAD 核验。
- 本地独立 Nginx 存储入口提供 HTTPS、精确前端 Origin 的 CORS，保持原始 URI/Host、关闭访问日志、请求/响应缓冲并移除 Cookie。它只作本地 MinIO TLS 接入，API 不处理媒体字节；生产浏览器直接访问云存储 HTTPS 地址。原始 S3 端口不发布，控制台仅绑定回环地址。
- 一次性初始化创建私有 Bucket、独立媒体账号与仅限 `media/*` 的 Get/Put/Delete 策略；API 不接收管理凭据。MinIO 完成核验使用客户端 complete，不新增事件桥或直接接收原生通知。现有 `/provider-events/oss` 仍仅用于可信 HMAC 桥接，不因 s3 配置自动转换原生事件。
- 上线使用现有 OSS 适配器，或验证兼容能力后配置 S3 云服务。供应商切换不自动迁移对象；已有媒体必须保留 key 复制、核验元数据与权限、暂停写入后切换，并保留旧存储用于回滚。生产不部署本地 MinIO 或存储代理，不将开发媒体加入 PWA 缓存。

## 备选方案

- 仅修改 OSS endpoint：OSS 与 S3 签名协议不同，不能直接复用 `ali-oss`。
- 替换全部存储实现：增加上线迁移成本；保留两种适配器使云环境配置可独立验证。
- 本地 HTTP 存储直传：会与 HTTPS 客户端产生混合内容兼容问题；采用独立 TLS 存储入口。

## 后果

开发常驻内存预算增加 MinIO 384 MiB 与存储入口 32 MiB，初始化容器上限 128 MiB，不作为生产资源基线。开发密钥由忽略提交的 `.env` 提供。云服务的条件写、签名头、CORS、生命周期、配额及数据迁移必须独立验收，不能由本地 MinIO 测试推断已通过。
