# ADR 0005：对象存储供应商基线

- 状态：已接受
- 日期：2026-11-01

## 背景

平台必须让浏览器直接上传和下载媒体，API 只负责授权、上传意图、对象核验、元数据和状态。生产环境位于中国大陆场景的可能性较高，同时需要私有对象、短时签名 URL、生命周期管理和较小的 API 运行时依赖。

## 备选方案

- **阿里云 OSS**：中国大陆区域可用，支持私有 Bucket、Presigned URL、浏览器直传、分片上传、对象 HEAD/Stat、事件通知和生命周期规则。
- 腾讯云 COS：能力满足要求，但当前没有区域、账号或运维优势足以优先选择。
- Cloudflare R2：S3 兼容且无出站流量费用，但中国大陆访问和合规部署条件需要额外确认。
- 七牛云：适合部分媒体场景，但当前希望先以 OSS 的官方 SDK/签名能力建立 adapter 边界。

## 决策

MVP 对象存储供应商选择阿里云 OSS。所有 provider-specific SDK 和签名细节必须隔离在 `apps/api/src/providers/object-storage/` adapter 内；业务模块只依赖上传、HEAD/Stat、删除和事件验签所需的最小接口。

Bucket 默认私有。API 生成服务端控制的 object key，并为精确对象和方法签发短时授权；浏览器直接与 OSS 传输媒体字节。API 不代理、不缓冲、不转码媒体，也不把签名 URL 写入数据库、日志、审计或 Service Worker 缓存。

正式部署前仍需完成区域、Bucket CORS、生命周期、事件通知签名、配额、加密和合规配置验证。若部署条件变化，只替换 adapter 与配置，不改变领域媒体状态机。

## 后果

- API 需要实现 OSS adapter 的签名和对象元数据核验，但不会承载大文件流量。
- 测试必须使用 fake adapter 覆盖签名授权、HEAD/Stat、重复事件和过期对象，不依赖真实 Bucket。
- 供应商切换成本集中在 provider adapter 和部署配置，业务 contract 保持稳定。
