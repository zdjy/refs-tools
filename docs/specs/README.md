# 产品与技术规格

本目录存放产品与技术规格，描述范围、参与者、预期行为、边界情况及可测试的验收标准。具体架构决策存放于 [`docs/decisions/`](../decisions/README.md)。

开发规约仅维护在[编码规约索引](../agents/coding-standards.md)链接的主题文档中，由根级 [`AGENTS.md`](../../AGENTS.md) 引用；本目录不另设 DDD 或编码规约。业务术语见[统一语言表](../../GLOSSARY.md)。

## 规格索引

- [FS-0028：平台创建组织邀请码与所有权移交](./0028-platform-invites-and-ownership-transfer.md)：一次性邀请码直通启用组织、平台直接移交与负责人发起、接收人接受后生效的移交，含管理端与裁判端界面；主路径已浏览器实测，未覆盖项与已知缺陷见规格 §8。
- [FS-0027：裁判端组织、邀请、成员关系与角色](./0027-referee-organizations.md)：我的组织、目录与申请加入、成员码兑换、自助创建申请、组织工作区（成员/邀请/成员码/角色）及配套后端接口；浏览器实测与通知投递等见规格 §7、§8。

- [FS-0026：管理端界面精修](./0026-admin-ui-refinement.md)：登录后落点修复、模板路由下架、登录页去模板化、筛选区对齐、顶栏可访问性与窄屏适配，并记录未处理项。

- [FS-0025：弱网与加载反馈](./0025-network-resilience-feedback.md)：离线 / 较慢 / 未响应 / 恢复的全局提示，GET 自动重试与写操作不重试，骨架、提交说明与路由进度条的统一时序，两端实现与验收。

- [FS-0024：操作结果与恢复反馈修复](./0024-operation-feedback.md)：补齐两端真实业务的 toast、弹窗内结果、复制失败恢复与本地持久化反馈，保留资料冲突输入。

- [FS-0023：裁判端账号设置](./0023-account-profile-settings.md)：`/profile-setting` 维护昵称、头像、实名、手机号、地区、生日，三步核验更换登录邮箱，复用密码设置；`referee_profiles` 落库与手机号唯一约束的显式例外。

- [FS-0022：社区优先的一级导航与移动端品牌入口](./0022-community-first-navigation.md)：取消「首页」概念，桌面为社区/学习/组织/工具、移动为社区/学习/工具/组织/我的，`/forum` 下线，移动「工具」位改为方形品牌标。

- [FS-0020：裁判端桌面账号菜单与账号入口页](./0020-desktop-account-menu.md)：桌面主导航移除「我的」、顶栏用户名菜单（我的主页、我的组织、账号设置、意见反馈、退出登录）与两条建设说明页。

- [FS-0019：移动底栏工具扇形菜单](./0019-mobile-tools-fan-menu.md)：移动端「工具」原地展开扇形快捷入口，末项「更多」进入全部工具汇总页。

- [FS-0018：论坛为主的用户端首页](./0018-forum-first-home.md)：版块筛选、讨论检索与信息流、工具及学习履职入口。

- [FS-0017：管理端文件管理](./0017-admin-file-management.md)：平台媒体查询、详情、理由下载、留存约束与可重试删除。

- [FS-0016：组织成员与定向邀请](./0016-organization-membership.md)：成员查询、入会审核、定向邀请及回应、移除/退出与实时角色撤销。

- [FS-0015：管理端组织治理首期](./0015-admin-organization-management.md)：组织查询、代录申请、平台审核、冻结/解冻与原子运营授权。

- [FS-0013：管理端用户 CRUD](./0013-admin-user-management.md)：基于真实 PostgreSQL 与 HttpOnly Cookie 会话的用户查询、创建、编辑、停用和逻辑删除；不包含角色 CRUD。

- [FS-0014：媒体直传控制面与客户端上传部件](./0014-media-control-plane.md)：上传/核验/读取/删除、客户端重试与压缩、实际验收及后续业务接入限制。

- [FS-0012：裁判端 macOS 毛玻璃 UI 改版](./0012-macos-vibrancy-ui.md)：以新 UI 规范重做圆角、阴影、动效、毛玻璃导航与激活态，范围与验收标准。

- [FS-0011：内容门户的动效与模拟论坛](./0011-portal-motion-and-simulated-forum.md)：首页与阅读页的 Awwwards 式编排、Motion 动效、标注为示例的模拟论坛；在 FS-0008 基础上的窄范围例外。

- [FS-0010：管理端深浅两套配色规范](./0010-admin-color-theme.md)：管理端 Light / Dark 主题、浅色侧边栏、暖黑深色侧边栏及组件颜色映射。

- [FS-0009：管理端登录页中性配色](./0009-admin-login-colors.md)：登录页去除红色、浅深色主题与交互状态验收。

- [FS-0008：裁判端内容型首页与内置阅读](./0008-editorial-home.md)：编辑式首页、自编学习导读、明确标注的讨论示例及完整阅读体验；保持现有 UI 规范。

- [FS-0006：裁判端首页与模块导航实施规格](./0006-home-navigation.md)：首页结构、全模块路由、建设状态、身份反馈及工作台往返安全已实施；自动化与浏览器记录及剩余人工验收见规格 §11。

- [前端响应式尺寸细分](./0005-responsive-layout.md)：手机、平板到宽桌面的布局切换、长内容与横屏弹窗验收。

- [存量界面 Tailwind 迁移](./0004-tailwind-migration.md)：保持 UI 视觉与交互不变的迁移范围、必要 CSS 例外和回归验收。

- [队伍级记录台](./0003-team-scorer-console.md)：队伍比分、技术统计、联动计时、球队暂停、球权、撤销与本地导出，不含球员名单。

- [MVP-001：第一期范围与业务规则](./0001-mvp-scope-and-business-rules.md)：正式学习/考试与认证范围、选派/工具/论坛 Beta 边界、角色、状态机、媒体规则和验收标准。
- [FS-0002：第一期 MVP Feature Spec](./0002-mvp-platform-feature.md)：按 Goals & Non-Goals、Data Model、API Contracts、Edge Case Handling、Implementation Task List 组织的系统分析与实现契约。
