# Naive UI Admin 源码来源与本地适配

- 上游：<https://github.com/jekip/naive-ui-admin>
- 采用：MIT 开源版 `v3.0.0`，不含 Max / Next 商业版。
- 固定 commit：`c9db4cde447240eaa17fbe439f507680819add3d`。
- 原始版权与 MIT 全文保存在同目录 `LICENSE`，生产构建同时输出 `/admin/licenses/naive-ui-admin.txt`。
- 选型依据：[ADR 0017](../../../../docs/decisions/0017-admin-template-selection.md)。需求、验收与限制见 [FS-0007](../../../../docs/specs/0007-admin-console.md) 及[迁移验收记录](../../../../docs/specs/0007-admin-template-acceptance.md)。

## 1. 导入方式与可追溯性

先核对本地上游 Git 工作区无修改且 HEAD 等于固定 commit，再直接复制下表源文件到管理端，最后在复制后的源码上裁剪和适配。不是保留原 `AdminShell` 改名，也不是根据截图仿写。原 `src/components/layout/AdminShell.vue` 和 `AdminNavigation.vue` 已删除，根应用实际加载 `src/layout/index.vue`。

`source.json` 记录每个上游路径、本地路径、原始 Git blob ID 与 SHA-256；SHA-256 对 Git 原始字节计算，不对 Windows CRLF checkout 计算。核查命令在 `apps/admin-web` 执行：

```sh
pnpm test:template --upstream=../../.cache/admin-template-research/naive-ui-admin-source
```

上游可以位于任意目录，但必须包含该 commit。不提供 `--upstream` 时只执行本仓库装配、许可、安全与行数检查，不冒充上游网络核查。审阅差异可分别用 `git show <commit>:<source>` 和本地文件对照；适配后的文件不应再与上游摘要相同，只有 LICENSE 保持原文。

## 2. 保留源码与必要修改

| 上游路径 | 本地路径 | 复用与修改 |
| --- | --- | --- |
| `src/layout/index.vue` | 同路径 | 保留 `NLayout has-sider` → 桌面 `NLayoutSider` / 移动左侧 `NDrawer` → `NLayoutHeader` / `NLayoutContent` → MainView 的布局结构；保留 collapsed 与移动 Drawer 联动。删除横向/混合主题选项、TabsView、BackTop 和废弃代码。Less 布局转为 Tailwind 4，颜色走公开主题；不显示组件库的小尺寸侧栏 bar，改由顶栏 44px 按钮控制。 |
| `src/layout/components/Header/index.vue` | 同路径 | 保留顶栏左侧折叠、route.matched 面包屑与右侧会话操作分区；移除演示刷新重定向、搜索、GitHub、锁屏、全屏、语言、头像假个人中心及配置 Drawer。演示 logout 替换为既有 Cookie 会话命令，不弹模拟成功、不刷新绕过清理。 |
| `src/layout/components/Menu/index.vue` | 同路径 | 保留 NMenu options、collapsed/width、selectedKeys、expandedKeys 和菜单选择事件；删除 asyncRoute/权限过滤/远程菜单/多语言订阅，改为静态入口投影。标签使用 RouterLink，保留深链接、aria-current 和键盘导航；字形标识提供折叠态可辨识入口，不新增图标包。 |
| `src/layout/components/Main/index.vue` | 同路径 | 保留 RouterView slot 与 `Component` / `route.fullPath` key；删除所有 KeepAlive、动态路由 store 与过渡分支，路由离开即销毁审计状态。 |
| `src/layout/components/Logo/index.vue` | 同路径 | 保留居中品牌及 collapsed 隐藏标题的结构；换成本地文字品牌、首页链接，不迁入图片。 |
| `src/views/exception/404.vue` | `src/views/NotFoundView.vue` | 保留异常页居中标题、返回首页按钮与导航处理；删除演示插图，改语义 token 与紧凑内容区。 |

从布局脚本中抽出 `src/layout/useLayout.ts`，保留模板的移动判断/折叠模型并修复 resize 监听未清理问题；断点与项目 lg 一致（1100px），仅跨档重置，避免软键盘触发误关闭。新增关闭后焦点恢复和导航后主内容焦点编排。菜单表现投影位于 `Menu/menu.presentation.ts`，不承担授权。

上游 Header 及 layout 的超长 SFC、全量组件注册、Less、硬编码颜色、内部深层覆盖没有获得豁免；裁剪后各 SFC 均小于 230 行，复杂状态独立，UI 主题集中在 `ui-theme.ts`，无新增依赖或锁文件变更。

## 3. 未迁入的能力及原因

- 上游 user / storage / asyncRoute / router guard / Mock / `.env.production`：演示后端、Token 持久化及动态安全边界与既有 Cookie/静态路由不兼容；不进入本应用源码和生产构建。
- TagsView / KeepAlive：不保留私有审计视图，不持久化访问历史。
- BasicForm / BasicTable：已检查，但它们的 schema 动态全局组件、泛型 CRUD/页码查询和演示联动不是本次登录表单与审计游标协议。保留现有具备字段标签/错误焦点的表单与可在手机阅读的审计卡片，不为迁移壳重写已测试的业务交互，不引入 `naive-ui/lib/*` 内部类型路径。
- BasicModal：当前没有业务写操作或确认用例；移动导航实际使用上游布局的 NDrawer，不为保留组件而增加假 Modal。
- 403/500 独立页：审计错误须保留筛选/重试和安全导航，不能改成整页跳转。404 使用上游源码，403/网络错误继续在原业务状态内呈现。
- 图表、富文本、上传、统计看板、远程图片、演示账户：无对应业务 API，不提供假数字或模拟成功，不引入其依赖及配套后端。

## 4. 依赖与许可检查边界

继续使用 workspace 已有 Vue 3.5.44、Naive UI 2.45.3、Pinia 4.1.0、Router 5.4.0、Vite 8.3.5、TS 5.9.3、Tailwind 4.3.3；没有沿用上游 Pinia 2 / Router 4 / Tailwind 3 工具链，也不并装两套版本。

Vite 内建 `build.license` 输出 `/admin/licenses/dependencies.json`，包含本次实际 bundle 的 20 项依赖及可获取的许可正文，声明均为 MIT，除 `@juggle/resize-observer` 为 Apache-2.0。`test:template` 校验声明白名单和模板原始 MIT 原文/生产副本。本次没有引入新运行时依赖。

这不是完整供应链审计：既有 `@css-render/plugin-bem`、`@css-render/vue3-ssr`、`css-render`、`vdirs` 的 npm 包没有随包附带 LICENSE，Vite 只能输出其 MIT 声明而无正文。css-render 固定发布 Git commit 可取得仓库 MIT 原文；vdirs 发布 gitHead 不在当前公开仓库历史中，不能把其他项目版权拼成其正文。本次明确记录该既有分发缺口，不声称全部传递依赖均完成法律审计。模板自身的版权全文已完整保留并随静态产物分发。
