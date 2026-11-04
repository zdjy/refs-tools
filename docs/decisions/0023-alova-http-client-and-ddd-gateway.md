# ADR 0023：前端请求层迁移至 alova，并按 DDD 封装网关

- 状态：已接受
- 范围：`apps/referee-web`、`apps/admin-web` 的 HTTP 请求层
- 关联：[ADR 0002](0002-direct-to-object-storage-media-flow.md)、[ADR 0008](0008-client-state-and-routing.md)、[ADR 0010](0010-email-auth-and-session-security.md)、[ADR 0022](0022-admin-user-crud-and-cookie-boundary.md)、[前端规约](../agents/coding-standards/frontend.md#4-请求层alova-与-ddd-网关封装)

## 背景

裁判端的 `auth.api.ts`、`media.api.ts` 各自手写 `fetch`，重复实现超时、`{ data }` 信封解包和错误翻译。管理端另有一份 `adminRequest`，同时保留了框架自带的 alova 演示实例（演示 token、Mock、`code/result` 信封、全局弹窗），两者都不适合真实私有 API。

项目对请求层有硬性约束：私有 API 响应与预签名 URL 不得被缓存（根级 `AGENTS.md`）；对象存储直传必须不带平台 Cookie 与 Referer（ADR 0002）；认证只依赖 HttpOnly Cookie（ADR 0010、0022）。alova 3 默认缓存 GET 5 分钟、合并并发相同请求，并把响应写入内存或 localStorage，直接使用会违反上述约束。

## 决策

1. 两个前端应用的网络通信统一使用 `alova` 3.x 的 `alova/fetch` 适配器。不引入 `statesHook`、`useRequest` 等 UI 绑定：请求层只返回 Promise，加载、错误、重试状态继续由页面 Composable 与应用状态层负责。
2. 每个客户端实例必须设置 `cacheFor: null`、`shareRequest: false`、`snapshots: 0`，并把 `l1Cache`、`l2Cache` 替换为不保存任何内容的适配器。这些设置集中在 `src/api/http/alova-instance.ts`（管理端为 `platform-client.ts`），业务代码不得自行创建 alova 实例。
3. 请求层分三层：
   - **传输客户端**（`src/api/http/`）：`PlatformClient` 处理同源 Cookie、`no-store`、超时、信封解包；`ObjectStorageClient` 处理预签名直传，使用独立实例，`credentials: 'omit'`、`referrerPolicy: 'no-referrer'`、`redirect: 'error'`、无超时、由外部 `AbortSignal` 取消。传输层只抛出 `HttpError`（`network` / `http` / `invalid-response`），不携带原始异常或 URL。
   - **上下文网关**（`<feature>.api.ts`）：按限界上下文提供 `create<Feature>Api(client)` 工厂和默认实例，是防腐层，把 `HttpError` 翻译为本上下文的错误类型（如 `AuthApiError`、`MediaApiError`）与稳定错误码，并负责路径、幂等键和业务语义的状态码判断（如直传 409 视为对象已存在）。
   - **应用层**（Composable、Store、状态工厂）：只依赖网关的 Promise 接口和上下文错误类型。
4. alova 的类型、`Method` 对象和 `HttpError` 不得越过 `src/api/` 目录。网关通过工厂注入客户端，测试替换 `fetch` 或客户端即可，无需模拟 alova。
5. 管理端保留框架演示用的 `utils/http/alova` 实例，仅供尚未接入真实接口的模板页面使用；任何真实 `/api/v1` 请求必须走 `src/api/http/platform-client.ts`。演示实例随模板页面清理时移除。
6. `Method` 是惰性的，只有 `await` 或 `send()` 后才发出请求；需要取消的调用必须先 `send()` 再绑定 `abort()`。`File` 会被 alova 序列化为 `{}`，直传必须以 `Blob` 传入。

## 备选方案

- **继续手写 fetch**：无新依赖，但超时、信封、错误翻译持续重复，拒绝。
- **使用 alova 的 `useRequest` 等 hooks**：与 Composable 分层冲突，把加载与错误状态放进请求层，并默认带缓存语义，拒绝。
- **axios**：体积更大，且仍需自行封装，没有额外收益，拒绝。
- **让网关直接暴露 alova Method**：调用方可绕过缓存禁用，且测试必须依赖 alova，拒绝。

## 后果

- 裁判端生产 JS 约增加 1 KB（gzip 约 0.3 KB），新增依赖 `alova`（及其 `@alova/shared`）。管理端已有该依赖。
- 公共错误类型 `AuthApiError`、`MediaApiError` 及其错误码保持不变，状态层和 UI 不需改动。
- 管理端用户接口的错误提示改为 `AdminApiError`，仍使用服务端公开的 `error.message`；网络失败给出固定中文提示。
- 升级 alova 时需回归：缓存禁用、无请求体 POST 不带 `Content-Type`、Blob 直传、取消与超时，相应测试位于 `apps/referee-web/test/http-client.test.ts`、`apps/admin-web/test/platform-client.test.ts`。
- 新增后端模块的前端接入遵循同一结构，无需再评估请求库。
