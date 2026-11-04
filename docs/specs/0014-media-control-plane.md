# FS-0014：媒体直传控制面与客户端上传部件

- 范围：`.scratch/mvp-platform/issues/03-media-direct-upload.md`、FS-0002 Task 5/6。
- 状态：控制面与复用部件已实现，待真实 OSS 和后续业务接入验收。
- 决策：[ADR 0021](../decisions/0021-media-control-plane.md)。部署：[媒体说明](../../apps/api/db/MEDIA_DEPLOYMENT.md)。

## 行为与边界

1. 已验证账号请求上传意图，服务端检查用途、目标、格式、扩展名、大小与配额，生成对象 key。幂等键在同用户内唯一，同键不同文件返回 409。
2. 浏览器直接 PUT 私有 OSS，签名绑定 MIME、owner、media ID 和禁止覆盖头。授权 300 秒，intent 900 秒；可续签但不延长 intent。上传/下载媒体内容不经过 API。
3. complete 与可信事件均独立 HEAD，比对类型、精确字节数、归属和 ETag；客户端提供的 checksum/etag 不作为核验依据。pending 才允许进入 available/rejected/expired，终态不能复活。
4. 读取 URL 有效期 60 秒，实时授权并审计，强制下载/no-store。删除先逻辑撤销并原子审计，再执行存储删除，失败可幂等重试。已核验的认证/考试/赛后材料不允许通用删除。
5. 事件桥使用独立 HMAC 和 300 秒时间窗，原始 JSON 上限 4 KiB；不是 OSS 原生 callback，桥接器必须先验证 OSS 事件来源。事件 ID 持久去重，不保存原始回调或 URL。
6. 维护命令单连接、单并发、每批最多 100 条，仅在 intent 到期后清理未可用对象，不能删除 available。
7. 前端交付 `features/media/MediaUpload.vue`、无 Vue 的上传状态用例、API 适配、浏览器压缩工具。上传失败保留当前页面文件，重试先 complete 避免重复创建；取消/离开使旧响应失效。只有服务端确认 available 才显示成功。
8. 预览独立 JPEG、最长边 1600px、最多 2 MiB；不覆盖原图，超大原图仍可尝试压缩，解码失败明确反馈且不上传。原图保留为显式业务选项，不在部件中暗中上传。

客户端界面引用 [共享 UI 规范](../ui/macos_fiba.md)，使用既有 token 与 Naive UI，无新视觉例外。部件不新增独立导航入口，须由认证/学习/论坛等页面提供具体用途和目标。

### 不宣称完成的能力

- 当前 learning 限 content_editor/owner，认证/论坛未发布附件限 owner；组织认证草稿要求当前 active membership/organization。学习发布后的读者共享、认证审核员读取、活动考试答卷、已签到主裁上传必须由所属模块解析真实关系，未接入时拒绝。不以客户端 target 或组织管理角色替代。
- 无真实 OSS 部署参数，不宣称完成 CORS、RAM、生命周期、桥接器联调；无 multipart、病毒扫描、文件内容签名检测或公共媒体发布。元数据核验不能证明文件内容安全。
- PUT 无浏览器可设置的精确 Content-Length，最终 HEAD 控制可用性，不宣称存储已强制大小上限。Bucket 配额/告警与内容安全仍需部署验证。
- 没有完整认证/考试/赛后页面、原图选择或压缩交互，不把复用部件视为完整业务闭环。

## 验收记录

以下为本次实际执行结果；工作区存在同时进行的管理端用户管理改动，不属于本 ticket。

| 检查 | 结果 |
| --- | --- |
| TDD | 已确认领域策略、Service/HTTP、真实数据库、客户端状态/压缩四组边界；记录过缺实现的 red，再逐条补实现转 green |
| 针对性快测 | 媒体 Service/HTTP/OSS SDK 签名/配置、策略、客户端重试/取消/压缩通过 |
| 全量快测 | 47 文件、237 项通过（包括当前工作区同时存在的管理端测试，不全归本次新增） |
| 单测内存 | Node `--max-old-space-size=192`，独立 PowerShell 采样 Vitest 进程峰值 WorkingSet 160.8 MiB；此为采样值而非内核严格峰值 |
| 类型与构建 | `pnpm typecheck`、API 及共享包 build、裁判端 build、独立 test:styles 通过 |
| 构建产物 | 主 CSS 37.36 kB / gzip 7.19 kB；媒体部件尚无业务路由引用，JS 未因它同步引入 OSS SDK；未建立同环境改动前体积对照，不声称体积零增长 |
| 媒体真实数据库 | 3 项通过：并发幂等/完成、审计失败回滚、CHECK、真实成员退出与事件重放；迁移基架 8 项通过 |
| 全量数据库 | 38 通过、1 失败（当时媒体为 2 项，之后新增 1 项单独通过）；既有 `audit/http.integration.test.ts:42` 将非 owner 认证员读取期望为 200，但当前 audit.read 策略仅 owner/admin，实际 404。该断言在本次基线已存在，未通过扩大授权修复它 |
| 独立浏览器 | 合成文件与 fake API，无真实身份：320px/1280px DOM 无横向溢出；生产 CSS 下输入/按钮高度 44px；失败后保留文件、DOM 激活重试后成功。原生点击/Enter 的 harness 激活未稳定，不能记为原生键盘完整通过 |
| 浏览器真实压缩 | Canvas 2400×1600 合成 JPEG → 1600×1067、10808 字节、独立 `synthetic-preview.jpg`，原文件名保留 |
| 视觉/辅助技术 | 截图工具超时；未取得独立视觉截图、系统 reduced-motion/屏幕阅读器完整验收，不标通过 |
| 真实 OSS | 未执行；需要部署账号、私有 Bucket 与可信桥接器 |

## 两轴审查

审查基线为任务开始时 `5cbcdf7`，提交只包含媒体任务的暂存 diff。并行操作期间 HEAD 有其他提交/工作区改动，已逐文件及共享文件逐块隔离。当前没有子代理工具，未执行双代理独立审查；由主执行者按 code-review 技能的 Standards / Spec 分开检查，不冒充独立评审。

- Standards：发现 PostgreSQL CHECK 的 NULL 三值逻辑缺口，已补 `verified_size_bytes IS NOT NULL` 与 self owner 约束并复跑真实集成；无遗留分层/文件长度硬性违规。暂存 diff 检查通过；整个工作区 diff 中并行 `bootstrap.ts` 的无关尾随空格未纳入本次提交。
- Spec：真实 OSS、后续业务授权/审批及完整业务页、原生键盘/视觉/reduced-motion 三组缺口仍保留。当前控制面按最小权限默认拒绝，不能仅靠它把关联后续业务 ticket 标完成；本 ticket 保持 partial 状态。

## 交付自检（对应 workflow 21 项）

| 项 | 结论 |
| --- | --- |
| 1 SQL 分层 | 业务 SQL 仅 MediaRepository/迁移 |
| 2 无驱动端口 | Service 只依赖无 pg 类型的事务、Repository 和存储端口 |
| 3 同连接事务 | 事务装配共用 client，存储 IO 在事务外，审计失败回滚已真实验证；基础设施事务未修改 |
| 4 所有权/约束/并发 | 媒体表由 media 模块拥有；CHECK、唯一键、账号/媒体锁；迁移及真实集成测试通过 |
| 5 Vue 行数 | 上传部件低于 230 行 |
| 6 HTTP 分离 | `.vue` 无 fetch，统一 api/media.api.ts；该网关经 alova 传输客户端发请求，直传使用独立无 Cookie 客户端（[ADR 0023](../decisions/0023-alova-http-client-and-ddd-gateway.md)） |
| 7 共享载荷 | TypeBox DTO 在 contracts/media.ts |
| 8 规则/Service 测试 | 媒体策略与控制面、状态转换有对应测试 |
| 9 授权 | 复用实时 Casbin/成员端口，不新增角色策略副本或缓存，未知业务目标拒绝 |
| 10 Naive UI 边界 | 只在上传展示部件，不进入领域或状态用例 |
| 11 组件归属 | 部件归属媒体功能目录，不跨业务页面引用 |
| 12 主题 | 使用既有 token/集中主题，无私有样式覆盖 |
| 13 状态交互 | 授权/上传/核验/失败/可用分开，取消及重试明确；敏感通用删除由服务端留存限制 |
| 14 状态所有权 | 页面内存状态工厂，无 Pinia 或持久化 |
| 15 Router | 无路由变更，不用守卫承担授权 |
| 16 UI 验证 | 触控/尺寸/状态/压缩已部分验证；原生键盘/视觉/reduced-motion 未完整通过，见上表 |
| 17 注释 | 中文意图注释，无死代码或无 issue TODO |
| 18 单位/边界 | 字节、TTL、预览大小写入类型/函数说明，未在核心篮球规则硬编码 |
| 19 Tailwind | 新部件用静态工具类，无新增纯 CSS |
| 20 token/断点 | 复用语义 token，无默认品牌色或 important |
| 21 样式产物 | 独立 styles 检查和生产构建通过；体积和浏览器限制如实记录 |
