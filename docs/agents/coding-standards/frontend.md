# 前端规约：Vue 3 + Vite + TypeScript

本文件属于[全栈架构与编码规约](../coding-standards.md)。

裁判端前端应用内部遵守本规约；管理端真实业务页面同样遵守本文件的分层边界与操作反馈要求，视觉与存量工程例外以管理端规格为准。目录中的样式文件职责见[样式规约](styles.md)。

## 1. 模块组织：三权分立 (`apps/referee-web/src/`)

前端必须贯彻“**展示组件、状态交互、API 通信**”物理分离原则：

```
apps/referee-web/src/
├── ui-tokens.ts                 # 设计 token 单一来源，注入为 CSS 变量
├── ui-theme.ts                  # UI 框架主题适配，集中映射共享设计 token
├── styles/                      # Tailwind 入口、token 映射与全局基线（详见样式规约）
├── components/ui/               # 按实际复用需求建立的无业务基础组件
├── api/
│   ├── http/                     # 传输客户端：alova 实例、HttpError（详见第 4 节）
│   └── <feature>.api.ts          # 限界上下文网关：create<Feature>Api(client) 与默认实例
└── views/<feature>/
    ├── <Feature>View.vue          # 主视图（纯骨架、布局组装）
    ├── <feature>.css             # 仅在必要时保留有说明的局部 CSS 例外（详见样式规约）
    ├── use<Feature>.ts            # 页面交互状态、表单逻辑、列表分页等组合式函数
    └── components/                # 该页面私有子组件
        ├── <Feature>List.vue      # 列表/表格展示
        └── <Feature>Dialog.vue    # 新建/编辑弹框

```

## 2. 前端硬性约束

* **禁止网络请求内联**：

  * 严禁在 `.vue` 的 `<script setup>`、Composable、Store 中直接书写 `fetch()`、`axios` 或创建 alova 实例。

  * 所有网络通信必须通过 `src/api/<feature>.api.ts` 网关调用，网关再经 `src/api/http/` 的传输客户端发出，详见[第 4 节](#4-请求层alova-与-ddd-网关封装)。

* **Composable 逻辑抽离**：

  * 凡是超过 40行的状态逻辑（包括分页筛选、表单状态、校验、异步加载控制），必须抽离至 `use<Feature>.ts`。

  * `.vue` 文件的 `<script setup>` 仅保留组件传参、依赖注入（provide/inject）与简单的视图驱动逻辑。

* **单文件长度红线**：

  * 任何 `.vue` 文件的总代码行数**不得超过 230 行**。一旦超限，必须将子部件下沉至同级 `components/` 文件夹。

## 3. UI 组件框架与 DDD 边界

基础组件库采用 **Naive UI 2.x**，选型依据见 [ADR 0007](../../decisions/0007-vue-ui-framework.md)；视觉与交互基线统一引用 [共享 UI 规范](../../ui/macos_fiba.md)。本节只定义工程边界，不另建配色、排版或圆角规范。UI 框架属于表现层技术依赖，不是领域模型、业务规则或应用服务。

### (1) 依赖方向与职责归属

| 位置 | 允许承担的职责 | 禁止行为 |
| --- | --- | --- |
| `packages/contracts` | 跨端 DTO、请求/响应 Schema | 引入 Vue、Naive UI 或表单、表格等组件库类型 |
| `packages/domain`（含应用内尚未迁出的纯领域模块） | 资格、计时、犯规、规则集等纯业务计算 | 引入 Vue、Naive UI、DOM 或任何 UI 状态；返回组件实例、提示框或带颜色的展示配置 |
| `src/api/http/` | 创建 alova 实例、统一缓存/Cookie/超时/信封策略、抛出 `HttpError` | 引入 Vue 或 Naive UI；知道任何业务路径、业务错误码或文案 |
| `src/api/<feature>.api.ts` | 本上下文的路径、请求组装、按契约返回数据；把 `HttpError` 翻译为上下文错误类型 | 引入 Naive UI；弹提示、控制弹窗、生成表格列或执行表单交互；向外暴露 alova 类型 |
| `views/<feature>/use<Feature>.ts` | 调用 API/领域函数，编排页面状态、提交、错误和重试 | 依赖 Naive UI 的组件实例、表单/表格类型或通知 API；依赖组件内部 DOM |
| `views/<feature>/components/` 与主视图 | 展示数据、绑定状态、处理组件事件、适配 UI 库类型 | 内联网络请求、持久化访问、业务规则或权限判定；直接改写领域对象 |
| `src/components/ui/` | 跨页面通用交互、无业务基础组件适配 | 引用业务页面、业务 Composable、API 或领域模块；内置裁判资格、比赛状态等业务含义 |
| `src/ui-theme.ts` 与应用入口 | 主题映射、Provider 配置及表现层装配 | 请求业务数据、执行领域规则或维护业务状态 |
| `src/stores/` | Pinia store 作为应用层状态适配器，拥有确需跨组件/路由共享的状态，调用状态工厂或应用服务并暴露面向用例的命令与只读状态 | 承载领域不变量、直接操作 UI/DOM、直接请求网络或自行决定持久化策略 |
| `src/router/` | 显式静态路由表、URL 参数解析与导航到视图的映射；通过路由 props/元信息传递导航所需输入 | 承载领域规则或复杂用例编排；依用户角色动态生成安全边界；直接访问数据库、持久化层或发起业务 API 请求 |

* 依赖流向保持为：**展示组件 → 页面 Composable / 应用状态适配器 → 应用服务 / API / 领域函数**；通用 UI 组件只依赖 Vue、Naive UI 与无业务的表现层工具，不反向依赖具体业务模块。应用入口负责装配 Router、Pinia 与依赖，不拥有业务状态。
* 业务组件按领域词汇命名（如 `AssignmentList.vue`），接收只读 props，通过语义化事件（如 `confirm`、`select-referee`）表达意图；业务动作交由页面 Composable 或应用服务编排，不能把 UI 库事件对象传入领域函数或 API。
* **状态按 DDD 职责分层**：领域状态与不变量由 `packages/domain` 的纯模型/函数表达，不能由 Vue 响应式对象、Pinia store 或路由守卫定义；应用状态负责用例流程编排，可用纯状态工厂/应用服务实现，并由 Pinia 适配其生命周期和跨视图共享；界面状态（焦点、展开、临时输入、弹窗开关等）留在组件或页面 Composable。状态归属依据业务语义和生命周期决定，不因“需要响应式”就把业务模型放进 store。
* Pinia 仅用于有明确跨组件/路由共享需求的应用状态，不为每个页面机械建 store；页面局部状态留在页面 Composable。Store 应保持可测试，可通过注入 ports 或依赖工厂隔离 IO；网络请求走 `src/api/`，持久化走明确的 infrastructure adapter。Pinia 默认不持久化，认证凭据、服务器权威数据及私有业务记录不得因使用 store 而自动写入浏览器持久存储。状态所有权和例外遵循 [ADR 0008](../../decisions/0008-client-state-and-routing.md)。
* Vue Router 属于应用层入口/导航适配器：只维护显式路由与导航呈现所需元信息，将 URL 参数解析为视图或用例输入；页面/应用层不得反向依赖 Router 实例。守卫仅做导航体验所需的登录态/流程跳转，不执行领域不变量、用例副作用或资源授权；后端 API 必须独立鉴权。路由表及状态策略遵循 [ADR 0008](../../decisions/0008-client-state-and-routing.md)。
* 表格列、筛选选项、状态文案/颜色和表单绑定属于表现层投影，放在组件或同业务目录的 `*.presentation.ts` 中；该文件可引用 UI 库类型，但不得发送请求、执行持久化或成为领域规则的唯一实现。Naive UI 专属类型不得泄漏到 DTO、领域模型、API 返回值或页面 Composable 的公开接口。

### (2) 直接使用与封装策略

* **允许展示组件显式按需导入 Naive UI 基础组件**；不得为了“隔离框架”给每一个 `NButton`、`NCard` 建立无差别透传包装。优先复用库提供的焦点、禁用态、模态语义等交互能力。
* 只有存在跨页面重复的产品交互约定、统一可访问性要求或组件库适配差异时，才在 `src/components/ui/` 建立封装（如 `UiConfirmDialog.vue`），以最小 props、emits 和必要 slots 暴露稳定接口，不复制整套第三方 API。
* 带领域语义的列表、状态标识、比赛面板等保留在所属业务模块。单页面组件先放入 `views/<feature>/components/`，不得因“可能复用”提前放入通用 UI 层；后续跨业务复用仍需明确所有者，不得页面之间互相引用。
* 通用 UI 组件同样遵守本规约的 `.vue` 单文件行数上限；封装不得成为绕过 40 行状态逻辑抽离规则的容器。局部焦点、展开/收起等纯交互逻辑可以留在组件内，复杂的库适配可提取到 `src/components/ui/` 内的 `useUi*.ts`，不得混入业务 Composable。
* UI 框架依赖只声明在实际使用的前端应用中，不提升到 `contracts`、`domain` 或 API。保持显式按需导入，禁止全量全局注册、导入库私有内部路径或未经决策引入自动组件扫描插件；新增其他 UI 组件库或改变共享方式前先评估产物与维护成本并记录 ADR。

### (3) 主题、样式与 Provider

* 当前主题入口为 `apps/referee-web/src/ui-theme.ts`，使用 `GlobalThemeOverrides` 集中映射共享 UI 规范；全局 CSS 变量必须与主题保持同一语义和取值，不得另立一套视觉 token。主题增长时可按组件拆分适配文件，但必须由同一入口导出。
* `NConfigProvider` 在应用根部统一装配；`NMessageProvider`、`NDialogProvider` 等按实际需求在表现层接入，不得在业务页面重复配置全局主题，也不得在模块顶层创建脱离根主题的全局通知/弹框实例。
* 颜色、字体、圆角、阴影、触控尺寸和通用交互状态优先通过主题与通用 UI 封装统一实现。页面使用 Tailwind CSS 处理布局和自有元素的展示差异，禁止散落重复的 `theme-overrides` 或为单页发明新 token。Tailwind 的依赖、CSS-first 配置、token 映射、类名扫描与存量 CSS 迁移边界统一见[样式规约](styles.md)，选型见 [ADR 0013](../../decisions/0013-tailwindcss-styling.md)。
* 优先使用库公开的 props、slots 与主题接口；不得默认依赖 `.n-*` 内部结构、深层选择器或 `!important` 修补样式。确有公开接口无法覆盖的缺口时，将覆盖集中在适配层，注明原因与兼容风险，并在升级时回归验证。
* 第三方组件的默认配色、按钮形状及状态不视为已符合项目规范；移动优先密度、至少 44×44 CSS px 的触控目标、可见键盘焦点、可访问名称、弹窗焦点恢复和 reduced-motion 均需实际验证。可访问性或业务操作密度与视觉示例冲突时，按根级 `AGENTS.md` 的优先级处理，并在相关规格记录窄范围例外，不机械套用营销页的大留白。

### (4) 表单、反馈与业务规则

* Naive UI 表单规则仅承担必填、格式及字段级交互反馈。资格、时间冲突、计时转换、规则集等业务不变量仍由领域纯函数定义；服务端对受保护操作独立执行授权与校验。输入组件的 `min` / `max`、禁用按钮或隐藏操作不能替代这些规则。
* 页面 Composable 对外提供加载、提交、错误、结果等与组件库无关的状态。`useMessage`、`useDialog`、`FormInst`、`FormRules` 等库适配只允许位于展示组件、表现层投影或 `components/ui/` 内的纯 UI 适配中，不得为了弹提示让业务状态层依赖 UI 框架。
* Store 与 Composable 的公开接口使用领域/应用语义命令和与 UI 无关的数据，不暴露组件实例、路由对象或 Naive UI 类型；导航由表现层根据用例结果发起，不能让领域层/应用状态层直接调用 `router.push()`。
* 展示组件可以调用表单实例进行交互校验，校验通过后以表单值/语义事件交给页面 Composable；不得把表单实例作为业务提交函数的参数，也不得将带渲染函数或响应式引用的 UI 对象作为 API Payload。
* 异步操作明确区分加载、空数据、失败、陈旧/离线与待同步状态，提供可见反馈与重试入口；不将网络异常伪装成空列表，不仅靠颜色或短暂 toast 表达错误。提交期间防止重复触发，失败保留可恢复输入；未获服务端确认的离线操作不得提示为已完成，UI 库也不得自行承担缓存或同步职责。
* 删除、清空及其他破坏性操作通过清晰的确认流程触发语义化业务命令；UI 确认框仅负责交互，不承担授权，也不绕过规格要求的理由、二次确认或审计。

### (5) 操作反馈完整性

* **反馈覆盖整个操作生命周期**：每个真实业务操作在实现前明确触发、进行中、成功、失败及恢复方式。新增、保存、删除、审核、冻结/解冻、邀请/撤销等显式写操作，获得权威成功结果后必须提供一次语义明确的 toast；不能仅以关闭弹窗、刷新表格或按钮恢复作为成功反馈。查询、筛选、分页与高频记分/计时不逐次弹成功 toast，使用加载状态及可见结果，避免刷屏。
* **结果必须真实**：服务端写入以 API 成功为准，本地持久化以存储端口成功为准。校验失败、权限不足、离线拦截、用户取消或写入失败不得发送成功提示；无改动说明「没有需要保存的修改」，不冒充写入。上传完成不等于核验或业务绑定完成，下载/导出已发起不等于浏览器已保存，邀请已创建不等于对方已加入。
* **状态与表现分离**：业务 Composable/Store 只暴露结果、错误、加载等普通状态，toast 由展示组件或 `components/ui/` 的纯 UI 适配经根 `NMessageProvider` 呈现，不在 API、传输拦截器、domain 或业务 Composable 中调用通知 API。不使用全局 HTTP 成功拦截器推断业务完成。两应用各自维护适配，禁止跨应用引用。
* **逐次而非重复通知**：一次操作只由一个表现层入口负责 toast。相同动作连续成功仍须逐次反馈，不能因相同字符串被 watcher 合并而漏报；挂载/路由返回不重播历史结果，卸载后停止监听。状态型结果在新尝试前清空，并使用同步观察或独立结果事件保证同轮清空再赋值可见。
* **不可只靠短暂提示**：表单错误、冲突、离线、待同步和部分完成须有持续的就近文本及恢复入口；失败保留可恢复输入，复制失败须捕获异常并说明权限/手动复制等替代路径。弹窗未关闭时，结果、错误与重试入口必须在弹窗内可见，不能藏在遮罩后的页面。持久结果用 `role="status"`，错误用 `role="alert"`，不只靠颜色表达；toast 不抢走键盘焦点。
* **写入与刷新分别反馈**：写入已成功但后续列表/详情刷新失败，不改报「保存失败」诱导重复写入；同时保留成功事实、陈旧说明与仅重试读取的入口。提交期间显示 loading 并防止重复写入、关闭或切换操作对象；异步查询失败不得冒充空结果。
* **统一通知体验**：复用当前应用主题及根 Provider；普通结果默认约 4 秒，错误补充 toast 约 6 秒，支持关闭及悬停保留。重要说明仍在页面内保留，不依赖延长 toast 代替错误恢复；不添加包含邮箱、实名、签名 URL 或原始异常的通知。
* **测试与验收**：覆盖成功、失败不报成功、重复相同操作、提交互斥、写入成功但刷新失败及观察器销毁。适配器测试使用通知回调替身，不在纯逻辑单测加载组件库。浏览器验证弹窗覆盖层、移动视口、键盘/焦点和可访问状态。

### (6) 测试与升级检查

* 领域状态与用例状态逻辑应可脱离 Pinia、Vue Router、DOM 和 UI 库进行单元测试；对 API 使用边界替身，保证纯领域测试不依赖 DOM。对 Pinia/Router 的适配只测试其装配、导航映射和生命周期行为，不重复验证框架本身。新增通用 UI 封装只测试自有行为（props/emits、禁用/加载、确认/取消和可访问性），不重复测试组件库内部实现。
* 焦点管理、键盘操作、移动布局、弱网反馈与主题一致性在独立浏览器/集成检查中验证，不并入低内存纯逻辑单测；单测继续遵守低于 300 MB 的项目预算。
* 接入、升级或新增组件后执行相关单测、`typecheck` 与生产构建，并比较构建产物变化；不得因使用 UI 框架增加生产期前端服务、远程组件 CDN 或敏感数据缓存。

## 4. 请求层：alova 与 DDD 网关封装

HTTP 客户端采用 **alova 3.x（`alova/fetch` 适配器）**，选型与取舍见 [ADR 0023](../../decisions/0023-alova-http-client-and-ddd-gateway.md)。请求层只返回 Promise，**不使用 `statesHook`、`useRequest` 等 UI 绑定**；加载、错误、重试状态属于页面 Composable 与应用状态层（见第 3 节）。

### (1) 三层结构与依赖方向

```
Composable / Store / 状态工厂 → <feature>.api.ts（上下文网关，防腐层） → api/http/（传输客户端） → alova/fetch
      只见上下文错误类型            翻译 HttpError → 上下文错误             只抛 HttpError
```

| 层 | 位置 | 职责 | 对外可见 |
| --- | --- | --- | --- |
| 传输客户端 | `src/api/http/` | 创建 alova 实例；同源 Cookie、`no-store`、超时、`{ data }` / `{ error: { code } }` 信封解包；失败统一抛 `HttpError` | `PlatformClient`、`ObjectStorageClient`、`HttpError`，均为 Promise 接口 |
| 上下文网关 | `src/api/<feature>.api.ts` | 路径与参数编码、请求头（如幂等键）、业务语义的状态判断；把 `HttpError` 翻译为本上下文的错误类型与稳定错误码 | `create<Feature>Api(client)` 工厂、默认实例、`<Feature>ApiError`、`<Feature>Api` 类型 |
| 应用层 | `use<Feature>.ts`、`stores/`、`application/` | 编排用例、保留输入、重试；通过注入的网关对象获得 IO | 不接触 alova、`HttpError` 或原始响应 |

### (2) 硬性约束

* **禁止缓存私有数据**：每个 alova 实例必须同时设置 `cacheFor: null`、`shareRequest: false`、`snapshots: 0`，并将 `l1Cache`、`l2Cache` 替换为不保存内容的适配器。alova 默认缓存 GET 5 分钟、合并并发相同请求并可写入 localStorage，与根级 `AGENTS.md` 禁止缓存私有 API 响应及签名 URL 的要求冲突。

* **实例集中创建**：只允许在 `src/api/http/` 内调用 `createAlova`。业务网关、Composable 和组件不得自建实例或直接 `import 'alova'`。

* **平台 API 与对象存储隔离**：访问 `/api/v1` 使用 `PlatformClient`（`credentials: 'same-origin'`）。预签名直传使用独立的 `ObjectStorageClient`（`credentials: 'omit'`、`referrerPolicy: 'no-referrer'`、`redirect: 'error'`、无超时、由 `AbortSignal` 取消），不得与平台实例共用配置；签名 URL 不写入日志、错误或缓存。

* **防腐层必须翻译错误**：`HttpError` 与 alova 的原始异常不得穿过网关。网关抛出上下文错误类型（如 `AuthApiError`、`MediaApiError`）和稳定错误码；面向用户的文案由表现层或错误映射函数提供，不依赖服务端异常文本，也不暴露 URL、签名或响应体。

* **网关通过工厂注入**：导出 `create<Feature>Api(client)` 与默认实例，并以 `export type <Feature>Api = typeof <feature>Api` 导出类型。状态层用 `api = <feature>Api` 形参注入，测试传入替身或注入 `fetch`，无需模拟 alova。

* **契约类型来自 `packages/contracts`**：请求与响应的载荷类型从 contracts 导入；`{ data }` 信封只在传输客户端解包，网关返回已解包的 DTO。

### (3) 使用 alova 的已知陷阱

* `Method` 是惰性 thenable：只有 `await` 或 `send()` 后才发出请求。需要取消时必须先 `send()` 再绑定 `abort()`，否则取消是空操作。

* fetch 适配器只透传 `string`、`Blob`、`FormData`、`ArrayBuffer`、`URLSearchParams`、`ReadableStream`，其他值（包括 `File`）会被 `JSON.stringify` 成 `{}`。直传文件必须以 `new Blob([file], { type: file.type })` 传入。

* 无请求体的 POST 也会被适配器写入 `Content-Type: application/json`，Fastify 会拒绝空 JSON 体。传输客户端必须把此类请求的 `Content-Type` 设为空串（适配器会剔除空值头）。

* 超时与网络失败都归一为 `HttpError('network')`；调用方需要区分用户取消时，使用 `AbortSignal` 的取消语义，不解析异常文本。

### (4) 测试要求

* 传输客户端：用注入的 `fetch` 验证信封解包、Cookie 与 `no-store` 配置、GET 不缓存不合并、无体 POST 头、错误码映射、网络失败与超时、取消。

* 网关：用 `PlatformClient` 替身验证路径、方法、请求头和 `HttpError` → 上下文错误的翻译表；不引入真实网络或 alova。

* 状态层与 Composable 继续使用网关替身，保持低内存纯逻辑单测。
