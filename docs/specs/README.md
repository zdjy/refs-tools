# 产品与技术规格

本目录存放产品与技术规格，描述范围、参与者、预期行为、边界情况及可测试的验收标准。具体架构决策存放于 [`docs/decisions/`](../decisions/README.md)。

开发规约仅维护在[编码规约索引](../agents/coding-standards.md)链接的主题文档中，由根级 [`AGENTS.md`](../../AGENTS.md) 引用；本目录不另设 DDD 或编码规约。业务术语见[统一语言表](../../GLOSSARY.md)。

## 规格索引

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
