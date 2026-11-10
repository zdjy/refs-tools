## 13. 验证记录

### 13.1 工程检查（2026-11-10）

- `npx vue-tsc --noEmit`：无错误。
- `npx vite build`：通过（约 39s，产物含未注册的模板演示页 chunk，与既有状态一致）。
- `pnpm vitest run apps/admin-web`：21 个文件 114 个测试全部通过。

### 13.2 浏览器核对（1440 / 1024 / 768 / 390 × 双主题）

- 壳层：顶栏 56px（品牌 / 帮助 / 主题 / 界面设置 / 账号，共 4 按钮）；侧栏 232px、当前项 = 红图标 + 2px 红竖条 + `surfaceMuted` 底；无标签栏、无面包屑；固定左侧菜单。
- 用户 / 组织 / 认证 / 文件 / 菜单（Mock） / 角色（Mock）六页均为「标题行 → 工具栏 → 表格卡 → 分页」骨架；菜单与角色页显示「Mock 数据」徽标。
- 主按钮为墨黑（浅色）/ 墨白（深色），非红色；红色只出现在侧栏当前项、焦点环、危险操作、错误横幅与选中行底色。
- 表格行高 36px、表头 32px；设置抽屉切换舒适档后行高 44px 并持久化（`ADMIN__UI-DENSITY`）；触屏/窄屏媒体查询生效（变量实测 44px）。
- 详情弹窗 560px、头部与底部 56px；打开后焦点落标题。
- 390px：无横向滚动；输入、选择、按钮命中区 44px；汉堡导航可用；768–1099px 隐藏创建时间列。
- 深色主题：画布 `#0B0B0C`、当前项红 `#F0705A`，侧栏竖条与图标计算值符合 §3.1.2。

### 13.3 v2.1 补充核对（2026-11-10）

补齐 v2 遗留的四项：破坏性操作的确认形态、焦点管理、认证页窄屏分栏、超长文件。

**就地确认（§5.2.1）**

- 用户 / 组织 / 认证 / 文件 / 成员 / 所有权 / 平台邀请码共 7 处破坏性动作全部改为 `AdminConfirmButton`；六个列表页与登录 / 异常页内 `grep 'preset="dialog"'` 为 0 命中，弹窗套弹窗的路径已消除（仅未注册的模板演示页 `views/list/basicList` 仍有 1 处，不在验收范围）。
- 用户编辑弹窗实测：点击「删除用户」→ 气泡在弹窗内展开（`placement="top-start"`，不再溢出到弹窗左侧），焦点自动落在「确认删除」；`modals` 计数保持 1。
- 组织详情实测：选治理动作并填写理由后，页脚左侧以 `danger` 文字按钮触发确认气泡，内容为「组织名：动作后果」；未填理由时按钮禁用，不允许打开气泡后再报错。
- `Button.textColorTextError` 未映射时，深色主题下 `type="error"` 的文字按钮会退化为灰阶（实测 `rgb(162,162,168)`）；映射到 `danger` 后为 `#F0705A`，修正见 §7.3。
- 焦点：弹窗关闭后焦点回到打开前元素（`AdminDialogShell` 记录 `document.activeElement`），行点击时 `AdminDataTable` 先把焦点交给该行 `.admin-cell-link`，因此鼠标与键盘两条路径都有确定的落点。

**键盘与 Esc**

- 气泡使用 `internal-trap-focus`，Tab 在「取消 / 确认」之间循环，不回到底层弹窗。
- Esc 在捕获阶段被 `AdminConfirmButton` 截获：先关闭气泡并把焦点交回触发按钮，底层弹窗保持打开（实测弹窗未关闭、焦点回到触发按钮）。
- 说明：本次验收环境的按键注入不会派发到页面 JS，Esc 与 Tab 的最终态通过派发合成 `KeyboardEvent` 与焦点检查确认，尚未在真实键盘上复验。

**认证审核窄屏分栏**

- 原实现用 `.split:has(.detail:not(:empty))` 判断，而 `.detail` 恒有子节点，导致 <1100px 时队列被永久隐藏、无法返回。已改为显式状态类 `is-detail` / `is-queue`。
- 实测 390px：未选中时 `queue: block` / `detail: none`；选中时 `queue: none` / `detail: block`；1440px：两栏同时显示，栅格 `320px 828px`。无横向滚动（`scrollWidth === clientWidth === 390`）。

**弹窗宽度与文件长度**

- 组织详情（720）、成员管理（720）、平台邀请码（720）、所有权移交（560）、认证决定（560）、文件详情（720）、用户详情（560）全部改用 `AdminDialogShell`；页面内不再自写 `:style="{ width }"`。
- 组织治理子弹窗（成员 / 所有权 / 邀请码 / 详情 / 创建）原先保留 `NAlert`、`size="large"`、`space-y-*` 与 `max-h-[…]` 模板写法，v2.1 已按 token 重写，失败提示统一为 `AdminStateBanner`，分页统一为 `AdminPagination`。
- 超 230 行的文件已按[前端规约](../agents/coding-standards/frontend.md)拆分：`certification.vue` 398 → 188（样式移入获准的 `certification.css`，191 行），`menu.vue` 285 → 142，`role.vue` 234 → 185，`AdminTopbar` 275 → 153，`AdminSider` 268 → 180，`AdminSettingsDrawer` 275 → 186，`CertificationDetail` 251 → 222。`src/views/system/**` 与 `src/components/admin-shell/**` 现全部 ≤ 230 行。

### 13.4 未覆盖项

- Esc / Tab 的最终态用合成事件与焦点断言验证，未在物理键盘上复验（见 §13.3）。
- `prefers-reduced-motion` 未做运行时截图核对，只按 §3.4 与 `styles/index.less` 的全局规则评审；`index.less` 已对 `*`、`.n-modal`、`.n-modal-mask`、`.n-base-wave` 归零动画与过渡。
- 未注册的模板演示页（dashboard、表单、列表等）与其模板组件（`components/Table`、`components/Form`、`components/Upload`、`Lockscreen` 等）仍超过 230 行：它们不在本规范验收范围（§1.2），未做拆分；若后续注册路由，须先按前端规约拆分。
- 表格窄屏「卡片列表」在弹窗内依赖视口断点，弹窗宽度小于视口时仍以横向滚动兜底；未额外实现容器查询。
