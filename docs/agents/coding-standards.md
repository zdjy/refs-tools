# 全栈架构与编码规约

本索引及其链接的主题文档共同构成当前项目（`refs-tools` Monorepo）统一的全栈架构与 AI 编码规约。人类开发者与 AI 助手在新增需求、重构和修复时均必须遵守；各主题只在对应文档维护，不在规格、ADR 或 README 中重复定义。

## 阅读顺序

- 开始任务前，完整阅读本索引、[Monorepo 依赖与边界](coding-standards/architecture.md)、[代码注释规约](coding-standards/comments.md)及[执行协议与自检清单](coding-standards/workflow.md)。
- 按任务范围完整阅读下表对应的主题文档；跨端任务同时阅读后端、前端及其涉及的样式规约。生成新代码前对照相应模板。
- 交付前逐项执行[自检清单](coding-standards/workflow.md#2-交付前自检清单必须逐条通过)，未涉及项标明不适用，无法执行的检查说明原因。

## 主题索引

| 文档 | 内容与适用范围 |
| --- | --- |
| [Monorepo 依赖与边界](coding-standards/architecture.md) | 所有任务：包职责、单向依赖、共享契约与模型边界 |
| [后端规约](coding-standards/backend.md) | API、持久化与迁移：五文件垂直切片、行数限制、Repository、事务、DDD 边界与验证 |
| [前端规约](coding-standards/frontend.md) | Vue 应用：展示/状态/API 分离、行数限制、Naive UI、Pinia、Router 与测试 |
| [代码注释规约](coding-standards/comments.md) | 所有任务：注释意图、JSDoc / TSDoc、TODO 及规格/ADR 引用 |
| [样式规约](coding-standards/styles.md) | UI 与样式变更：Tailwind CSS、token 映射、扫描与层叠、CSS 例外及迁移 |
| [后端代码模板](coding-standards/backend-examples.md) | 新建后端模块时对照的 Schema、路由、Service、类型与 Repository 示例 |
| [前端代码模板](coding-standards/frontend-examples.md) | 新建前端功能时对照的 API、Composable 与视图示例 |
| [执行协议与自检清单](coding-standards/workflow.md) | 所有任务：契约先行的实施顺序与交付检查 |

## 相关文档

- [根级 AGENTS.md](../../AGENTS.md)：产品、资源预算、安全、UI 基线与文档管理约束。
- [领域文档约定](domain.md)与[统一语言表](../../GLOSSARY.md)：领域资料阅读方式与业务术语。
- [产品与技术规格](../specs/README.md)：用户可见行为与验收标准。
- [架构决策记录](../decisions/README.md)：具体选型及历史取舍。
