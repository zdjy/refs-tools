# 移动端工具扇形菜单开发入口

**Status:** implemented-awaiting-manual-acceptance

唯一功能规格：[FS-0019：移动底栏工具扇形菜单](../../docs/specs/0019-mobile-tools-fan-menu.md)。本文只维护任务顺序，不复制产品规则或工程规约。

## 开始前

1. 完整阅读 FS-0019 及涉及的 FS-0006、共享 UI 规范与[编码规约索引](../../docs/agents/coding-standards.md)。
2. 核对 Git 工作区，保留无关用户改动。
3. 仅调整移动底栏「工具」的展开方式；不改工具页面、路由、桌面主导航与底栏其他入口。

## 任务顺序

| 顺序 | 可验证交付 |
| --- | --- |
| 1 | 扇形入口与角度纯函数（`src/navigation/tools-fan.presentation.ts`）及单测 |
| 2 | 扇形展示组件与开关/焦点 Composable（`ToolsFanMenu.vue`、`useToolsFan.ts`） |
| 3 | 移动底栏拆分为 `MobilePrimaryNavigation.vue`，桌面导航只保留桌面形态 |
| 4 | 自动化与浏览器验收，记录限制到 FS-0019 §5 |

## 完成定义

- FS-0019 第 4 节五条验收标准逐条核验；无法执行项明确记录原因，不标为通过。
- 不新增 API、数据库、依赖或全局状态；相关后端检查标注不适用。
