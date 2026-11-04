# FS-0023：裁判端账号设置（个人档案与登录方式）

- 状态：已实施，验证记录见 §8。
- 适用应用：`apps/referee-web`；后端 `apps/api`，共享契约 `packages/contracts`，纯校验 `packages/domain`。
- 业务依据：[MVP-001](0001-mvp-scope-and-business-rules.md)、[FS-0002 §3.2 身份与账号](0002-mvp-platform-feature.md)、[FS-0020 桌面账号菜单](0020-desktop-account-menu.md)、[FS-0013 管理端用户 CRUD](0013-admin-user-management.md)（后台改名与版本语义）。
- UI 依据：[共享 UI 规范](../ui/macos_fiba.md)、[响应式规格](0005-responsive-layout.md)。
- 工程约束：遵循[统一编码规约](../agents/coding-standards.md)，不在本文重新定义依赖、分层、样式或文件长度规则。

## 1. 背景与目标

FS-0020 把「账号设置」放进账号菜单，但落点 `/account` 只能查看邮箱与会话、设置或更换密码，档案字段完全不可修改：昵称只能由平台管理员通过后台改名，头像、真实姓名、手机号、地区、出生日期在数据库里根本不存在。本次交付：

1. 新增一级路由 `/profile-setting`（route name `profile-setting`），集中维护本人档案与登录方式。
2. 补齐 MVP-001 §2.2 已规划但未落地的 `referee_profiles` 表，承载实名、手机号、地区、生日与头像引用。
3. 邮箱从「只读展示」升级为可自助更换，采用旧邮箱验证码 + 当前密码 + 新邮箱验证码三步核验。
4. `/account` 保留为账号与会话概览，并作为注册后首次设置密码的落点（FS-0002 §3.2 验收不变）。

## 2. 可修改字段与规则

| 字段 | 存储位置 | 规则 |
| --- | --- | --- |
| 昵称 | `users.display_name`（唯一来源，不双写） | 去首尾空白后 1–80 字符；保存后顶栏与社区显示同步刷新 |
| 头像 | `referee_profiles.avatar_media_id` → `media_objects` | `purpose=avatar`、`target=self`，仅 JPEG/PNG/WebP，≤ 2 MiB；客户端先压缩为最长边 1600px 的 JPEG 预览 |
| 真实姓名 | `referee_profiles.legal_name` | 选填，去空白后 ≤ 40 字符；变更写入审计（只记录版本投影，不记录姓名内容） |
| 手机号 | `referee_profiles.phone_e164` | 选填，E.164 格式；**不做短信验证**，页面明确标注未验证且不用于登录 |
| 地区 | `referee_profiles.region_code` / `region_label` | 省/市/区三级联选，存区县级 6 位代码 + 展示快照；代码与标签必须成对 |
| 详细地址 | `referee_profiles.address_detail` | 选填，≤ 200 字符 |
| 出生日期 | `referee_profiles.birth_date` | 选填，`YYYY-MM-DD`，范围 1900-01-01 至今天 |
| 登录邮箱 | `users.email` / `email_verified_at` | 三步核验后切换，见 §4 |
| 登录密码 | `users.password_hash` | 复用 `POST /auth/password`，页面内共享既有「设置/更换密码」部件 |

可见性：昵称是公开投影；真实姓名、手机号、详细地址、出生日期只返回给本人（档案响应只在本人会话下产生），后续业务接入时按用途另行投影，不复用整份档案。

## 3. 数据模型

迁移 `apps/api/db/migrations/0008_referee_profiles.sql`：

- 新建 `referee_profiles`：`user_id` 主键并外键到 `users`，`legal_name`、`phone_e164`、`region_code`、`region_label`、`address_detail`、`birth_date`、`avatar_media_id`、`created_at`、`updated_at`。CHECK 约束覆盖长度、E.164、6 位地区代码、生日下线与「地区代码/标签成对」。
- `email_challenges.purpose` 增加 `email_change`；`media_objects.purpose` 增加 `avatar`。
- 并发令牌沿用 `users.version`：档案写先按版本条件更新 `users`（昵称 + 版本自增），再原子 upsert 档案行。后台改名同样递增该版本，因此两侧并发都会让另一侧得到 `409`，不需要第二套版本字段。

### 3.1 与既有规格的显式偏差

MVP-001 §2.3 要求「用户邮箱、手机号唯一」。本次手机号**不加唯一约束**：在未接短信验证的前提下，唯一约束会让任何人用他人号码抢先占用，且用户打错一位就无法自行更正。该偏差仅限未验证手机号，接入短信验证后需同时恢复唯一约束。邮箱仍保持唯一，切换冲突返回 `409 EMAIL_TAKEN`。

## 4. 接口合同

| 方法与路径 | 入参 | 行为 |
| --- | --- | --- |
| `GET /api/v1/profile` | — | 返回本人档案投影：`nickname/legalName/phone/regionCode/regionLabel/addressDetail/birthDate/avatarMediaId/version`。未登录 `401`。 |
| `PATCH /api/v1/profile` | 任意字段子集 + 必填 `version` | 局部更新；省略表示不改，`null` 表示清空；无变化不写库；`version` 不符 `409 VERSION_CONFLICT`；字段非法 `422`；`avatarMediaId` 必须是本人已核验的 avatar 上传，否则 `422 INVALID_AVATAR` |
| `POST /api/v1/auth/email-change` | `oldChallengeId/oldCode`、`newEmail`、`newChallengeId/newCode`、可选 `password` | 三步全过才切换：旧邮箱验证码 → 当前密码（`hasPassword` 为真时必填）→ 新邮箱验证码。切换后 `email_verified_at` 置为当前时间，撤销该账号全部会话并签发新 Cookie；邮箱被占用 `409 EMAIL_TAKEN`；新邮箱与当前相同 `422 EMAIL_UNCHANGED`；密码错误 `401 INVALID_CREDENTIALS` 且不消费验证码 |
| `GET /api/v1/media/{id}/read-url` | — | 既有端点；`purpose=avatar` 的目标对任意有效登录账号可读，其他用途仍只允许归属者或目标授权者 |

- 所有响应 `cache-control: no-store` 且 `vary: Cookie`；写请求沿用精确 Origin 校验。
- 邮箱 challenge 继续走 `POST /auth/email-challenges` 的 `purpose=email_change`，沿用既有发送频控与一次性消费语义；失败次数在事务内提交，不回滚。
- 档案写失败不产生半更新：昵称与档案字段在同一事务、同一连接内完成。

## 5. 页面与交互

- 路由：`/profile-setting`，标题「账号设置」，导航归属 `account`（移动底栏「我的」高亮）；页面使用统一导航外壳。
- 结构：左侧分区导航 + 右侧面板，三个分区为「个人资料」「修改邮箱」「修改密码」，顺序固定。
  - `tablet` 及以上：左侧 200px 纵向分区栏，右侧渲染对应面板；小于 `tablet`：分区栏变为顶部横向一排可滚动按钮，面板在其下方。
  - 个人资料面板：头像 + 档案字段；修改密码面板：共享密码部件（`embedded` 模式，不再自带上外边距与分隔线），同样采用**分步表单**。
  - 修改邮箱面板：**分步表单**，顶部为步骤指示器（圆形序号 + 标题 + 说明，已完成步骤改用勾选标记），下方只渲染当前步骤的字段，底部为「上一步 / 下一步」，最后一步按钮为「更换登录邮箱」。
  - 分区切换只改变渲染的面板，不重新请求档案、不丢失已填内容；页面底部保留指向 `/account` 会话概览的链接。
  - 档案读取失败只影响个人资料面板，修改邮箱与修改密码仍可正常使用。
- 保存仅在服务端确认后提示成功；失败保留输入，字段错误显示在对应输入下方并聚焦首个无效输入；版本冲突显示刷新提示并自动重读档案。
- 头像上传复用直传链路：选择文件 → 本地压缩 → 申请 `avatar` 上传授权 → 直传 → 核验 → 以 `avatarMediaId` 保存档案。任一步失败保留重试入口，不上报为已保存。
- 邮箱更换分步：`验证当前邮箱` → `确认当前密码`（无密码账号跳过该步，步骤总数随之变为 2）→ `绑定新邮箱`。
  - 「下一步」只校验当前步骤；最后一步提交时合并校验全部步骤，一次报出所有缺失项，避免用户反复回退才发现问题。
  - 「上一步」保留已获取的验证码与已填内容，只清空当前步的字段错误。
  - 旧邮箱与新邮箱各自独立申请验证码、独立 60 秒重发倒计时；未完成全部证明时不发出切换请求。
  - 提交成功后回到第一步、清空全部输入并提示成功；失败停留在当前步骤并保留输入。
  - 步骤指示器只做展示，不提供点击跳转：尚未验证的步骤被跳过会让服务端证明缺失。
- 密码更换分步：`验证当前邮箱` → `设置新密码`（新密码 + 确认）；首次设置密码（注册后 `hasPassword=false` 且邮箱已验证）只有一个 `设置登录密码` 步骤，不显示步骤指示器与「上一步」，按钮为「设置密码并完成注册」。
  - 步骤指示器复用通用组件 `components/ui/UiSteps.vue`，两份表单共享同一展示契约。
  - 响应式三档：`sm` 以下只显示圆点与连接线（步骤标签用 `sr-only` 保留给屏幕阅读器），完整文字由下方「第 N / M 步：步骤标题」提供；`sm` 起显示圆点 + 标题；`lg` 起追加说明文字（说明需要更大横向空间，过早出现会把指示器撑出卡片）。指示器不设 `overflow-x-auto`，任何宽度都不产生横向滚动条或标签裁切，连接线按 `li` 等分并填满剩余宽度。
  - 「上一步」保留已获取的验证码；最后一步提交时合并校验全部步骤。
  - `/account` 中的同一部件（非嵌入模式）行为一致，仅保留自带上外边距与分隔线。
- 地区选择必须到区/县才回写；只选省或市时不提交该字段，并保留「未填写」语义。

## 6. 可访问性与响应式

- 所有输入有显式 `<label>` 或 `aria-label`；错误通过 `aria-invalid` 与 `aria-describedby` 关联到说明文本，提交失败聚焦首个无效输入。
- 步骤指示器为有序列表，当前项带 `aria-current="step"`，并有「第 N / M 步」文本状态；已完成与未完成不只靠颜色区分。
- 分区栏使用 `role="tablist"` / `role="tab"` / `role="tabpanel"`，面板以 `aria-labelledby` 指向所属分区按钮；激活分区 `aria-selected="true"`，非激活分区 `tabindex="-1"`（roving tabindex）。
- 方向键：`ArrowLeft`/`ArrowUp` 与 `ArrowRight`/`ArrowDown` 都按同一次序循环并移动焦点，`Home`/`End` 跳到首尾；因断点会改变视觉方向，不声明 `aria-orientation`。分区按钮可点击，也可 `Enter`/`Space` 触发。
- 触控目标不小于 44×44 CSS px；文件选择使用原生 input + label，键盘可触发。分区按钮使用 `whitespace-nowrap` 且窄屏隐藏激活红点、收窄内边距，320px 下标签不折行也不产生滚动。
- 320px 起无页面级横向溢出：三级地区选择在窄屏纵向堆叠，`sm` 起三列；步骤指示器在窄屏收敛为圆点 + 连接线。
- 不依赖颜色单独表达状态：保存结果、上传进度与错误均带文本。

## 7. 测试

- `packages/domain/test/profile.test.ts`：昵称长度、E.164、地区成对与代码形态、生日上下界与真实日期、空白归一。
- `apps/api/test/profiles/*`：只提交改动字段、版本冲突、审计不含实名、头像归属校验、HTTP 身份与同源。
- `apps/api/test/auth/email-change.test.ts`：三步成功后的会话轮换、无密码分支、密码错误不消费验证码、邮箱占用、用途/邮箱不匹配。
- `apps/api/test/media/avatar-access.test.ts`：头像跨用户可读，其他用途维持私有；头像仅图片且目标必须本人。
- `apps/referee-web/test/profile-settings.test.ts`、`email-change.test.ts`：字段 diff、无变化不发请求、冲突后重读、字段错误定位、两步验证码与密码分支、分步校验、上一步保留输入、提交成功后复位。
- `apps/referee-web/test/usePasswordSettings.test.ts`：首次设置单步骤、有密码时两步导航、上一步保留验证码、最终提交一次报出全部缺失项。
- `apps/referee-web/test/profile-tabs.test.ts`：分区顺序固定、方向键循环与 `Home`/`End`、非导航按键不拦截。

## 8. 验收记录

- `pnpm typecheck`、`pnpm test`（77 文件 / 391 用例）、`pnpm build`、`pnpm --filter @refs-tools/referee-web test:styles` 通过。
- `pnpm test:db`（14 文件 / 58 用例）在本地测试库通过，其中迁移测试覆盖 `0008` 的 up/down 与幂等重跑，`profiles.integration.test.ts` 覆盖空档案读取、昵称与档案同事务落库、陈旧版本拒绝、地区成对约束、手机号 E.164 约束与头像归属外键。
- 行政区数据由 `pnpm regions:data` 生成（`scripts/generate-regions.mjs`，来源 `modood/Administrative-divisions-of-China`，MIT），仅保留省/市/区三级，按路由懒加载。
- 浏览器验收（`https://localhost:8443/profile-setting`，合成账号 `alova-test@example.com`，视口 305/360/485/768/960/1200 宽）：
  - 320px 与 375px：页面 `scrollWidth === clientWidth`，步骤指示器 `scrollWidth === clientWidth`，无横向滚动条；步骤条收敛为 ①——②——③，文字由「第 N / M 步」提供；三个分区按钮单行不折行。
  - 960px：分区栏为左侧 200px 纵向栏（三项目标 y 递增），右侧面板正常；1200px：步骤显示圆点 + 标题 + 说明，指示器宽度 706px < 卡片 756px。
  - 分步交互实测：获取验证码后「下一步」进入第 2 步（第 1 步显示勾选标记、`aria-current="step"` 落在第 2 步），「上一步」保留验证码输入；第 3 步出现新邮箱与验证码字段，按钮为「更换登录邮箱」；修改密码面板为 2 步并有「第 1 / 2 步」状态。
  - 键盘：`ArrowRight`/`End` 循环移动并同步焦点与面板，roving `tabindex` 为 `0/-1/-1`，焦点环可见。
- 头像直传在热更新开发模式（`pnpm dev`）下实测阻塞过：浏览器只信任的是开发 CA（`.cache/dev-certs/ca.crt`），而对象存储入口 `https://localhost:9443` 由 Compose 自签证书提供服务，预签名 `PUT` 被拦为 `net::ERR_CERT_AUTHORITY_INVALID`，随后 `POST /api/v1/media/{id}/complete` 返回 `409 OBJECT_NOT_FOUND`，页面提示「上传未完成」。代码与 API 行为符合预期（核验未通过不上报为已保存），处理方式是把 Compose 公开证书一并导入当前用户根证书存储并完全重启浏览器，见 README「本机热更新开发」与 [ADR 0026](../decisions/0026-local-hot-reload-dev-environment.md)。
- 未执行：信任两张证书后的头像直传与新 SMTP 服务器链路浏览器复验，需在部署环境复核。
