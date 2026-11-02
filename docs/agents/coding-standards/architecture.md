# Monorepo 依赖拓扑与核心红线

本文件属于[全栈架构与编码规约](../coding-standards.md)。

## 1. 包级依赖图谱与职责

```
                ┌─────────────────────────┐
                │   packages/contracts    │  (公共 DTO、请求/响应 Schema、通用类型)
                └────────────┬────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             │
┌───────────────────────────┐               │
│      packages/domain      │               │  (核心领域规则、纯状态计算、业务模型)
└─────────────┬─────────────┘               │
              │                             │
       ┌──────┴──────────────┐              │
       ▼                     ▼              ▼
┌──────────────┐      ┌───────────────────────────┐
│   apps/api   │      │   apps/referee-web[admin] │
└──────────────┘      └───────────────────────────┘
     (后端)                       (前端)

```

## 2. 跨包调用硬性红线

* **绝对单向依赖**：

  * `packages/contracts` 为基础契约层，**严禁依赖 workspace 内的任何其他包**，严禁引入具体 Web/DB 运行时（如 Fastify、Vue、pg）。

  * `packages/domain` 仅允许依赖 `packages/contracts`。**严禁引入任何 IO 库、HTTP 库、ORM 或数据库连接**，保证其为可移植的纯逻辑。

  * `apps/api` 与 `apps/referee-web` 或 `apps/referee-admin` 为终端应用，允许依赖 `contracts` 与 `domain`。两应用之间**严禁互相跨目录引用**。

* **零内联模型泄漏**：

  * 跨端交互的数据载荷（Payload）必须定义在 `packages/contracts`。

  * 严禁在 Fastify 路由或 Vue 组件中私自声明重复的数据结构。
