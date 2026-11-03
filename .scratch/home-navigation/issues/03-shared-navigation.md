# 03：共享导航与存量页面返回首页

**Status:** implemented-awaiting-manual-acceptance

**Blocked by:** 01：首页路由与导航定义；02：工作台页面往返状态安全。

**What to build:** 完成桌面及移动主导航，并为工作台、认证页面及 404 补齐可靠的返回首页路径。

## 必读

- [FS-0006 §4.2、§7、A04、B03～B05](../../../docs/specs/0006-home-navigation.md)。
- [共享 UI 规范](../../../docs/ui/macos_fiba.md)。
- [编码规约索引](../../../docs/agents/coding-standards.md)中的通用、前端与样式主题。

## 实施步骤

1. 在 `src/components/navigation/` 建立共享导航，消费任务 01 的配置，不复制各页面菜单。
2. 首页、学习入口、工具目录及建设说明页使用一致导航布局：小于 tablet 为移动底栏，tablet 起桌面主导航。
3. 设置当前页/当前栏目状态、可访问名称、跳到主内容链接，以及路由切换后的合理焦点；不要在业务状态中调用 Router。
4. 预留底栏高度和 safe-area，确保长页面末尾内容可见；不通过隐藏页面溢出来掩盖宽度问题。
5. 工作台品牌改为回首页，另保留跳到主内容入口；不增加底栏或移除既有清空操作。
6. AuthShell 品牌回首页，保留独立工作台入口，不改变表单布局、登录后跳转或账号页职责。
7. 404 提供返回首页和进入工作台，不静默重定向未知 URL。
8. 执行相关检查，并浏览器验证导航断点、键盘与工作台往返。

## 预期文件

- `apps/referee-web/src/components/navigation/`。
- 任务 01 新增视图的导航装配。
- `src/views/workbench/WorkbenchView.vue`、`src/views/auth/components/AuthShell.vue`、`src/views/NotFoundView.vue`，以上相对 `apps/referee-web/`。

## 验收

- [x] 五项一级导航目标正确，导航状态不依赖字符串模糊匹配。
- [x] tablet 前后只显示一套可聚焦主导航，当前页和栏目状态语义正确。
- [x] 工作台及 AuthShell 不被强行塞入移动底栏，品牌链接和快捷入口各司其职。
- [x] 320px 与横屏下导航不溢出、不遮挡页面操作。
- [ ] 键盘操作、可见焦点、跳到主内容及切换后的焦点可用。
- [ ] 浏览器前进后退正常，离开工作台不自动暂停或清空记录。
- [x] 类型检查、前端构建、样式生成检查通过。

## Comments

共享 Shell、桌面/移动导航、独立 skip link 与身份区均已实现，存量页面回首页接入。56 组合尺寸检查、横屏、长昵称、导航语义及工作台往返通过；路由后 main 获焦已验证。原生 CDP 键盘/鼠标事件在当前 harness 中存在无响应/超时，尚需人工补 Tab/Shift+Tab、Enter、skip link、前进后退及 reduced-motion 的完整操作，不将 DOM 激活等同于原生键盘验收。详见 FS-0006 §11。
