# ADR 0021：媒体控制面、不可覆盖上传与分阶段业务接入

- 状态：已接受
- 范围：MVP ticket 03、FS-0002 Task 5/6
- 关联：[ADR 0002](0002-direct-to-object-storage-media-flow.md)、[ADR 0005](0005-object-storage-provider.md)、[ADR 0014](0014-scoped-authorization-and-audit-foundation.md)

## 背景

媒体模块先于认证、考试、论坛和赛后记录模块实现，现有数据库只有账号和组织/赛事/比赛授权骨架。不能因缺少业务表而信任客户端声明的答卷、签到或资料发布状态。OSS 网络请求也不能占用数据库事务连接等待。

## 决策

- API 使用官方 `ali-oss` SDK，仅存储适配器依赖它；不自行实现 OSS 签名算法。媒体功能由 `MEDIA_ENABLED=true` 显式开启，开启但缺失配置必须阻止启动；关闭不注册媒体端点，不采用假存储降级。
- 首发采用单对象 PUT（视频上限 500 MiB）。客户端在授权有效期内可重试；`x-oss-forbid-overwrite:true` 和绑定 intent 的签名元数据阻止完成后覆盖。重试遇到已存在对象直接重试 complete。暂不提供 multipart，不宣称支持分片续传。上传 URL 300 秒、读取 URL 60 秒、intent 900 秒；续签不能延长 intent 寿命。
- 使用最小的存储端口签名、HEAD、删除。网络 IO 在事务外执行，返回状态前在短事务内重新检查会话账号、对象状态、作用域和授权；服务端生成 object key，不接受客户端 key、owner 或可见性。媒体始终 private，不根据 `authenticated` 标签直接公开。
- 上传类型采用 JPEG/PNG/WebP、PDF、MP3/M4A、MP4/WebM 保守白名单；认证仅图片/PDF，考试和赛后仅图片。默认限制沿用 MVP-001 §5.3，图片默认预览，显式 original 才使用原图上限。每用户最多 10 个未到期 pending、每日最多 50 个 intent，锁账号串行检查配额；不引入进程内限流事实源。
- learning 绑定 platform 且要求 `content.edit`；未绑定业务记录的认证/论坛附件只允许 owner 访问。组织认证草稿可显式绑定 organization，创建和后续 owner 操作要求当前 active membership/organization；读取仍限 owner，审核员必须等认证模块解析实际申请关系后再接入。考试和赛后上传必须由后续业务模块提供权限端口，默认拒绝，不能用组织者/裁判长身份代替考生归属、活动答卷或已签到主裁校验。不存在的目标、跨组织和不允许的目标统一隐藏为 404。
- 媒体引用时后续模块必须在自身事务内锁定并检查 available、owner、purpose、target。本次不伪造这些尚未实现的业务流程；私有读 URL 的业务共享也默认拒绝，直到所属模块实现当前关系与状态检查。
- HEAD 检查 key、媒体 ID/owner 元数据、精确类型与大小、ETag，不以客户端 ETag/checksum 作为可信证明。禁止把“元数据核验”称为病毒扫描或文件内容检测；可执行类型不允许，读取强制 attachment 与 no-store。需要内容签名/恶意文件扫描的发布流程必须由存储侧扫描提供证明，本次未实现，不开放公共发布。
- 删除先同事务标记 deleted 并审计，再在事务外删除对象；网络失败保持不可读并可幂等重试。考试、认证、赛后证据的 available 对象禁止通过通用删除接口销毁，等待所属业务审批/留存策略。终态不复活，pending 到期后不再续签或完成。
- OSS 事件通过受控事件桥接器投递有界 JSON，使用独立 HMAC-SHA256 密钥、时间戳（300 秒）、原始 body 和唯一事件 ID 验证。此协议不是 OSS 原生 callback 验签，部署必须配置可信桥接器；不接受客户端伪造或原生未验证回调。即使事件可信仍 HEAD 核验，事件 ID 和状态更新同事务幂等提交。客户端 complete 可独立完成，不依赖桥接器。
- 提供独立、单并发、每批最多 100 条的维护命令，核验超时 pending、删除 rejected/expired/deleted 孤儿；不在每个 API 副本运行后台定时器。对象在 PUT URL 过期前不得清理，避免迟到 PUT 再产生孤儿；Bucket 生命周期是兜底。短时授权不写数据库、日志、审计、localStorage 或默认缓存。

## 备选方案

API 代理媒体和事务内调用 SDK 违反资源预算；无覆盖保护的 PUT 会让已核验对象被替换；凭组织角色直接操作答卷/赛后证据会越过业务授权；自研 OSS 签名增加安全维护成本，均不采用。multipart 和原生事件验证可在真实部署验证后另加 adapter，不提前引入队列或扫描服务。

## 后果

增加 API 的 SDK 依赖与独立部署变量，需要验证 Bucket CORS、签名头、禁止覆盖和生命周期。fake 存储只能验证控制面，不能代替真实 OSS 联调。前端交付可复用直传状态、压缩工具和上传组件，不新增无业务归属的媒体管理页面。真实 PostgreSQL、真实 OSS、浏览器压缩分别报告执行情况，不将未执行检查标为通过。
