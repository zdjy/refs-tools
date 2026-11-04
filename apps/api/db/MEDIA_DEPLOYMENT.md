# 媒体控制面部署与接入

范围：MVP ticket 03、FS-0002 Task 5/6；设计取舍见 [ADR 0021](../../../docs/decisions/0021-media-control-plane.md)。

## 启用

默认关闭，不注册媒体端点。部署环境显式设置：

```dotenv
MEDIA_ENABLED=true
OSS_REGION=oss-cn-hangzhou
OSS_BUCKET=replace-with-private-bucket
OSS_ACCESS_KEY_ID=replace-in-deployment
OSS_ACCESS_KEY_SECRET=replace-in-deployment
MEDIA_EVENT_SECRET=replace-with-independent-random-secret-at-least-32-bytes
```

真实密钥由部署系统注入，不能提交到仓库。启用时缺少任一参数必须启动失败，不回退假对象存储。运行账号需要 `media_objects` SELECT/INSERT/UPDATE、`media_upload_events` SELECT/INSERT，以及现有账号/授权/审计最小权限，不需要 DDL。迁移新增 `0004_media.sql`，禁止改写历史迁移。

OSS RAM 凭据只允许指定私有 Bucket 的 `media/` 前缀 PutObject/HeadObject/GetObject/DeleteObject，无 ACL、Bucket 管理或 ListBucket 权限。启用 HTTPS、访问日志脱敏/禁记 URL 查询、存储加密、配额告警。配置 CORS 仅允许正式客户端 Origin、PUT/GET/HEAD，以及 Content-Type、x-oss-forbid-overwrite、x-oss-meta-media-id、x-oss-meta-owner-id；不能使用凭据通配来源。测试禁止覆盖头生效，Bucket 不可公开写。

## 控制面

API 前缀 `/api/v1/media`，所有响应 no-store，写操作要求精确 Origin 与当前 Cookie 会话。上传意图 JSON 上限 4 KiB；complete 上限 1 KiB，不接受 multipart 或文件字节。

- `POST /upload-intents`：必须带稳定 `Idempotency-Key`，同键不同载荷 409。purpose/contentType/sizeBytes/fileName/target/imageKind 由共享契约校验。返回精确对象 PUT URL，300 秒内有效。
- `POST /:mediaId/upload-authorization`：重新授权后续签，不能越过 900 秒 intent 寿命。
- `POST /:mediaId/complete`：客户端只需 `{}`；服务端 HEAD 比对类型、大小、媒体 ID、owner 与 ETag，只有 available 才允许业务引用。重试幂等，终态不复活。
- `GET /:mediaId/read-url`：实时权限校验，60 秒 GET URL，强制 attachment/no-store，签发记录审计。
- `DELETE /:mediaId`：同事务逻辑删除和审计后再请求 OSS 删除；存储失败可重试。认证/答卷/赛后留存证据的 available 对象拒绝通用删除，须等待业务审批策略。

预览图 2 MiB、显式 original 图片 20 MiB、PDF 20 MiB、音频 50 MiB、视频 500 MiB。认证仅图片/PDF，考试及赛后仅图片。每用户 10 个未到期 pending、每日 50 个 intent。PUT 不支持浏览器设置 Content-Length，因此不能宣称存储侧已强制文件大小；最终可用性由 HEAD 精确大小核验控制，Bucket 配额/告警限制攻击成本。未实现病毒或内容签名扫描，不开放公共发布；文件名/MIME/扩展名和 HEAD 不能证明内容安全。

learning 仅平台 content_editor 可申请，当前 owner 可读；认证/论坛附件为 owner 私有。组织认证草稿需当前有效组织成员。审核员、学习读者共享以及考试/赛后上传必须由所属业务模块核对真实记录关系与状态后接入；默认拒绝，不能仅凭客户端 target 或组织角色放行。

## 事件桥（非 OSS 原生 callback）

`POST /api/v1/media/provider-events/oss` 接收不超过 4 KiB 原始 JSON：

```json
{"eventId":"unique-provider-event-id","mediaId":"00000000-0000-4000-8000-000000000001","bucket":"private-bucket","objectKey":"media/owner/intent","type":"ObjectCreated"}
```

可信桥接器必须先验证 OSS 原始事件来源、Bucket 与事件种类，再转发。请求头 `x-refs-timestamp` 为毫秒 Unix 时间；`x-refs-signature` 为独立 `MEDIA_EVENT_SECRET` 对 `timestamp + "\n" + rawBody` 的 HMAC-SHA256 小写 hex。API 允许时钟偏差 300 秒，事件 ID 数据库去重，仍独立 HEAD，不信任通知声明。禁止把此端点直接配置成未验签的 OSS 原生 callback。未部署桥接器时客户端 complete 仍可运行。

## 孤儿维护与恢复

```bash
pnpm --filter @refs-tools/api media:cleanup
# 生产容器内
node apps/api/dist/media-maintenance-cli.js
```

部署调度器单实例串行调用，每批最多 100 条；数据库池 1、逐个对象删除。到期 pending 标记 expired，删除 rejected/expired/deleted 的对象，成功后标记 cleaned。失败退出非零，可重复执行，不打印底层异常或签名。PUT 授权到期前不标记清理完成，防止迟到 PUT 留孤儿；维护与 API 使用相同服务端时钟，部署需 NTP。Bucket 生命周期清理未完成分片及未追踪隔离对象，留存证据前缀不能配置统一短期删除。此首发为单 PUT，无 multipart 续传；中断先重试 complete，再重试原 intent PUT，409 已存在对象继续 complete。

前端 `features/media/MediaUpload.vue` 是供业务页面接入的上传部件；`direct-upload.ts` 只保留当前页面内存状态，取消/离开丢弃文件和签名。`compressPreview` 在浏览器生成独立 JPEG（最长边 1600px、最多 2 MiB），不覆盖原图；原图上传必须显式 original 且不超过 20 MiB。业务页使用 available 事件获取媒体 ID，不保存 URL。当前没有独立媒体管理路由，不把工具交付称为认证/考试已上线。

## 验收边界

快测验证控制面、SDK 签名选项、scope 默认拒绝、幂等、HEAD 不符、过期、审计和客户端重试/取消/压缩。`pnpm test:db` 独立验证真实 SQL、约束、并发及审计回滚；缺少数据库不得以替身结果代替。真实 OSS 的 CORS/禁止覆盖/HEAD/删除/生命周期和事件桥联调必须在部署环境执行，当前尚无实际 Bucket 验收。
