# FS-0028：平台创建组织邀请码与所有权移交

- 状态：已实施；自动化验证见 §7，主路径已做浏览器实测，未覆盖项与已知缺陷见 §8。
- 适用应用：`apps/api`；`apps/admin-web`（发码与平台移交）；`apps/referee-web`（邀请码输入、负责人移交与收件箱）。契约 `packages/contracts`（`platform-invites`、`organization-ownership`），纯规则 `packages/domain`。
- 业务依据：[FS-0001 §4.1、§4.3](0001-mvp-scope-and-business-rules.md)、[FS-0002 Task 7](0002-mvp-platform-feature.md)。取舍见 [ADR 0034](../decisions/0034-platform-invites-and-ownership-transfer.md)。
- 工程约束：遵循[统一编码规约](../agents/coding-standards.md)。UI 沿用各端现有基线，不新增视觉例外。

## 1. 范围

完成 Task 7 剩余两项：

1. **平台创建邀请码**：平台管理员发放一次性、短期有效的邀请码；持码的已验证用户提交组织申请时，组织直接以 `active` 创建，免平台审核。
2. **所有权移交**：平台管理员直接移交；现任负责人发起、接收人接受后生效。

不含：组织解散、邮件或站内通知、认证与选派联动。

## 2. 与 FS-0001 的差异

FS-0001 §4.3 写「所有权转移由平台管理员处理」。需求方要求增加现任负责人发起的路径，因此本规格在保留平台路径的基础上新增负责人路径，原文已同步补充说明。

## 3. 平台邀请码

- 明文 `ro_` + 43 位 base64url；成员码为 `rj_`。Schema 在入口按前缀拒绝跨用途，库内分表存储。
- 仅平台管理员（`platform.manage`）可创建、列出、撤销。有效期 1–7 天，默认 3 天；固定使用 1 次。
- 创建响应一次性返回明文；库与审计只存 SHA-256 和末 4 位。管理端明文默认遮蔽，关闭即清除，复制被拒时说明手动复制。
- 状态按查询时刻投影：已使用 > 已撤销 > 已过期 > 可使用。只有「可使用」的码可撤销。
- 兑换：`POST /me/organization-applications` 的可选字段 `platformInviteToken`。成功时组织为 `active`，申请人成为正式成员并获得 owner + organizer，审核人记为发码管理员。码无效统一 `PLATFORM_INVITE_INVALID`（422）。
- 邀请码路径不占用「待审核 3 个」名额。负责人实名与联系方式仍取自账户资料，资料不完整同样返回 `PROFILE_INCOMPLETE`。

## 4. 所有权移交

| 路径 | 入口 | 限制 | 生效 |
| --- | --- | --- | --- |
| 平台直接移交 | `POST /admin/organizations/:id/ownership` | `active` 或 `frozen`；理由必填；组织版本条件 | 立即 |
| 负责人发起 | `POST /organizations/:id/ownership-transfers` | 仅 `active`；仅负责人；每组织一个 pending；有效期 7 天 | 接收人接受后 |

- 接收人通过 `POST .../:transferId/accept|decline` 回应，发起人通过 `.../cancel` 取消，均带请求版本。非当事人一律按「不存在」处理。
- 新负责人须为 `active` 成员、账号有效、账户资料完整；发起与生效时各校验一次。
- 生效时同事务：旧负责人撤销全部组织范围角色，仅保留正式成员；新负责人获得 owner + organizer；组织行换 owner 并刷新实名与联系方式快照；仍待处理的请求被取代；审计 `organization.ownership_transferred`。
- 到期不依赖后台任务：读取时投影为 `expired`，新建请求时在组织行锁内落库。

## 5. 接口

| 方法与路径 | 说明 |
| --- | --- |
| `GET/POST /admin/organization-invites` | 分页列表 / 创建（一次性明文） |
| `POST /admin/organization-invites/:inviteId/revoke` | 撤销，带版本 |
| `GET /me/ownership-transfers` | 本人收件箱（未到期的 pending） |
| `GET/POST /organizations/:id/ownership-transfers` | 组织移交记录 / 发起 |
| `POST /organizations/:id/ownership-transfers/:transferId/accept|decline|cancel` | 回应或取消 |
| `POST /admin/organizations/:id/ownership` | 平台直接移交 |

迁移 `0010_platform_invites_ownership.sql` 新增 `platform_organization_invites` 与 `organization_ownership_transfers`；生产部署前须应用，并按[授权与审计说明](../../apps/api/db/AUTHORIZATION_AUDIT.md)授予两张表的 `SELECT, INSERT, UPDATE`。

## 6. 界面

- **管理端**：组织列表工具栏「平台邀请码」（生成、明文一次性展示、列表、撤销确认）；`active`/`frozen` 行「移交所有权」（成员选择、必填理由、二次确认）。
- **裁判端**：申请表单可选「平台邀请码」（密码型输入，成员码前缀单独提示）；成功页按服务端返回状态区分「已启用」与「等待审核」；负责人工作区新增「移交」标签（仅负责人可见）；「我的组织」页新增移交收件箱，接受前二次确认。
- 写操作成功后逐次 toast，失败保留输入；写入成功但刷新失败只提示重试读取。离线不发请求并说明「未提交」。

## 7. 验收记录

- 快速测试 111 文件、640 项通过；显式独立测试库执行数据库检查 16 文件、83 项通过，其中本任务新增 11 项真实 PostgreSQL 用例：邀请码仅落哈希、直通 active 全量落库、同码并发兑换仅一个成功、过期/撤销/未知码拒绝且不留半成品组织、审计失败整笔回滚、接受后换手一致、单 pending 并发约束、接受与平台移交并发仅一个生效（连续运行 5 次稳定）、取代待处理请求、到期落库、接受时审计失败回滚。
- `pnpm typecheck` 四个包与管理端 `type-check` 通过；两端生产构建通过。
- 迁移测试覆盖 `0010` 升级、回滚与重放。

## 8. 未完成与已知限制

- **浏览器实测（Chrome 远程调试，本机真实 API 与开发库，已执行迁移 `0010`）**：
  - 已验证：管理端发码（明文默认遮蔽且不可选中，显示后可选中，列表仅末 4 位，库内只存 64 位哈希，审计不含明文）；裁判端申请表单填入成员码前缀时就近报错并聚焦、不发请求；填入有效邀请码后组织直接启用，库内状态 `active`、版本 2、审核人为发码管理员、申请人获得 owner + organizer，并写入 5 条审计；同码重放与格式正确的未知码均 422 `PLATFORM_INVITE_INVALID` 且不留组织；负责人发起移交（二次确认、7 天有效期、接受前所有权不变）；接收人收件箱、接受前二次确认、接受后换手（新负责人 owner + organizer，原负责人仅保留成员，实名与联系方式快照刷新，审计齐全）；平台直接移交（未选人即继续被拦截、理由必填、二次确认、成功 toast 只弹一次、原负责人角色撤销、审计带理由）。
  - 320px：申请表单无页面级横向溢出。
  - **未覆盖**：接收人拒绝与发起人取消的界面路径；平台移交取代待处理请求的界面路径（仅有真实 PostgreSQL 用例）；键盘与焦点恢复、reduced-motion、弱网与离线；管理端发码面板与移交弹窗的窄屏表现；移交标签与收件箱在 320px 的表现。
  - 临时账号与数据已清理：账号停用、会话与邀请码/移交记录删除；两个测试组织因被追加式审计表引用无法删除，已置为 `dissolved`。迁移前的开发库备份留在被忽略提交的 `.cache/backups/`。
- **已修复并复验的缺陷**：①邀请码输入的“显示”图标原为 Naive UI 内置的 16×16 CSS px，达不到 44×44 触控目标；改为独立组件 `InviteTokenField`，用 44×44 原生按钮（`aria-pressed`，名称随状态变为“显示/隐藏邀请码”）。浏览器实测 320px 下按钮 44×44、无横向溢出，真实点击可在遮蔽与明文间切换。②邀请码直通成功后顶部副标题仍写“提交后由平台审核”：现按服务端返回状态切换为“组织已凭平台邀请码直接启用，无需平台审核”，成功页新增直达新组织工作区的“进入组织”按钮（两个按钮高度均为 44px），实测跳转到工作区且负责人标签齐全。
- 没有通知：接收人需回到「我的组织」查看；界面文案已如实说明。
- 收件箱与移交记录只读取第一页（20 条）。
- 候选人来自成员名单第一页（20 条）并按昵称过滤；成员很多时需先输入关键词。
- 组织解散、认证与选派联动仍未实现。
