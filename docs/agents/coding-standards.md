# 全栈架构规约与 AI 编码行为准则 (Coding Standards & Architecture Guidelines)

本规范是当前项目（`refs-tools` Monorepo）全生命周期开发的唯一最高行为准则。无论是人类工程师还是辅助编码的 AI 助手（如 Cursor、Windsurf、GitHub Copilot），在新增需求、重构、修补 Bug 时均**必须严格执行**本规约。

## 目录

1. [Monorepo 依赖拓扑与核心红线](#一monorepo-依赖拓扑与核心红线)

2. [后端规约：Node.js + Fastify + PostgreSQL](#二后端规约nodejs--fastify--postgresql)

3. [前端规约：Vue 3 + Vite + TypeScript](#三前端规约vue-3--vite--typescript)

4. [标准代码模板基准](#四标准代码模板基准)

5. [AI 开发执行协议与自检清单](#五ai-开发执行协议与自检清单)

## 一、Monorepo 依赖拓扑与核心红线

### 1. 包级依赖图谱与职责

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

### 2. 跨包调用硬性红线

* **绝对单向依赖**：

  * `packages/contracts` 为基础契约层，**严禁依赖 workspace 内的任何其他包**，严禁引入具体 Web/DB 运行时（如 Fastify、Vue、pg）。

  * `packages/domain` 仅允许依赖 `packages/contracts`。**严禁引入任何 IO 库、HTTP 库、ORM 或数据库连接**，保证其为可移植的纯逻辑。

  * `apps/api` 与 `apps/referee-web` 或 `apps/referee-admin` 为终端应用，允许依赖 `contracts` 与 `domain`。两应用之间**严禁互相跨目录引用**。

* **零内联模型泄漏**：

  * 跨端交互的数据载荷（Payload）必须定义在 `packages/contracts`。

  * 严禁在 Fastify 路由或 Vue 组件中私自声明重复的数据结构。

## 二、后端规约：Node.js + Fastify + PostgreSQL

### 1. 垂直切片模块组织 (`apps/api/src/modules/<feature>/`)

后端必须严格按照业务垂直切片（Vertical Slice Architecture）组织，严禁使用横向扁平结构。一个业务模块必须拆解为以下 5 个物理文件：

```
apps/api/src/modules/<feature>/
├── <feature>.routes.ts       # 路由声明、HTTP 状态码返回、中间件挂载
├── <feature>.schema.ts       # 路由输入输出验证 Schema（引用 contracts）
├── <feature>.service.ts      # 业务逻辑编排、权限判定、事务控制
├── <feature>.repository.ts   # 数据库访问（SQL/ORM 查询执行）
└── <feature>.types.ts        # 该模块专属私有类型（不公开给前端的内部类型）

```

### 2. 各层物理边界与行数限制

| 文件类型 | 核心职责 | 禁止行为 | 行数上限 | 
| ----- | ----- | ----- | ----- | 
| **`*.routes.ts`** | 解析 HTTP 请求，调用 Service，返回 Response。 | 严禁编写 SQL；严禁包含 `if-else` 业务判断；严禁直接读取数据库。 | 单 Handler $\le 20$ 行  总文件 $\le 150$ 行 | 
| **`*.schema.ts`** | 定义 Fastify 路由级别的 Params、Query、Body、Response 结构。 | 严禁在其中编写执行逻辑，纯静态 Schema。 | 总文件 $\le 150$ 行 | 
| **`*.service.ts`** | 编排业务流程、聚合计算、调用 Repository、抛出业务异常。 | 严禁直接引入 DB Client 执行查询；严禁接触 Fastify 的 `request` 或 `reply` 对象。 | 单函数 $\le 40$ 行  总文件 $\le 200$ 行 | 
| **`*.repository.ts`** | 纯粹的数据持久化操作，执行 SQL 或 ORM 方法。 | 严禁编写业务校验逻辑；严禁在此抛出 HTTP 状态错误。 | 单方法 $\le 30$ 行  总文件 $\le 200$ 行 | 

### 3. 数据访问与事务规约

* **数据库实例隔离**：数据库客户端（DB Client / Connection Pool）仅允许在 `*.repository.ts` 中引入。

* **事务边界下沉**：涉及多表一致性的事务操作，应在 `service.ts` 开启事务上下文，并将事务句柄传递给 repository。

* **业务异常统一**：Service 层只抛出带业务错误码的 DomainError（如 `NotFoundError`, `ConflictError`），由全局错误处理器转换为 HTTP 404/409，严禁在 Service 中直接调用 `reply.status(400)`。

## 三、前端规约：Vue 3 + Vite + TypeScript

本章同样适用于后续 `apps/referee-admin` 等 Vue 前端应用；各应用内部遵守相同边界，但不得相互跨目录引用。

### 1. 模块组织：三权分立 (`apps/referee-web/src/`)

前端必须贯彻“**展示组件、状态交互、API 通信**”物理分离原则：

```
apps/referee-web/src/
├── ui-theme.ts                  # UI 框架主题适配，集中映射共享设计 token
├── components/ui/               # 按实际复用需求建立的无业务基础组件
├── api/
│   └── <feature>.api.ts          # 纯网络请求函数（Axios/Fetch 封装）
└── views/<feature>/
    ├── <Feature>View.vue          # 主视图（纯骨架、布局组装）
    ├── use<Feature>.ts            # 页面交互状态、表单逻辑、列表分页等组合式函数
    └── components/                # 该页面私有子组件
        ├── <Feature>List.vue      # 列表/表格展示
        └── <Feature>Dialog.vue    # 新建/编辑弹框

```

### 2. 前端硬性约束

* **禁止网络请求内联**：

  * 严禁在 `.vue` 的 `<script setup>` 中直接书写 `fetch()` 或 `axios.post()`。

  * 所有网络通信必须通过 `src/api/<feature>.api.ts` 的函数调用。

* **Composable 逻辑抽离**：

  * 凡是超过 40行的状态逻辑（包括分页筛选、表单状态、校验、异步加载控制），必须抽离至 `use<Feature>.ts`。

  * `.vue` 文件的 `<script setup>` 仅保留组件传参、依赖注入（provide/inject）与简单的视图驱动逻辑。

* **单文件长度红线**：

  * 任何 `.vue` 文件的总代码行数**不得超过 230 行**。一旦超限，必须将子部件下沉至同级 `components/` 文件夹。

### 3. UI 组件框架与 DDD 边界

基础组件库采用 **Naive UI 2.x**，选型依据见 [ADR 0007](../decisions/0007-vue-ui-framework.md)；视觉与交互基线统一引用 [FIBA UI 规范](../ui/fiba_about_ui_specification.md)。本节只定义工程边界，不另建配色、排版或圆角规范。UI 框架属于表现层技术依赖，不是领域模型、业务规则或应用服务。

#### (1) 依赖方向与职责归属

| 位置 | 允许承担的职责 | 禁止行为 |
| --- | --- | --- |
| `packages/contracts` | 跨端 DTO、请求/响应 Schema | 引入 Vue、Naive UI 或表单、表格等组件库类型 |
| `packages/domain`（含应用内尚未迁出的纯领域模块） | 资格、计时、犯规、规则集等纯业务计算 | 引入 Vue、Naive UI、DOM 或任何 UI 状态；返回组件实例、提示框或带颜色的展示配置 |
| `src/api/<feature>.api.ts` | 网络请求、按契约返回数据 | 引入 Naive UI；弹提示、控制弹窗、生成表格列或执行表单交互 |
| `views/<feature>/use<Feature>.ts` | 调用 API/领域函数，编排页面状态、提交、错误和重试 | 依赖 Naive UI 的组件实例、表单/表格类型或通知 API；依赖组件内部 DOM |
| `views/<feature>/components/` 与主视图 | 展示数据、绑定状态、处理组件事件、适配 UI 库类型 | 内联网络请求、持久化访问、业务规则或权限判定；直接改写领域对象 |
| `src/components/ui/` | 跨页面通用交互、无业务基础组件适配 | 引用业务页面、业务 Composable、API 或领域模块；内置裁判资格、比赛状态等业务含义 |
| `src/ui-theme.ts` 与应用入口 | 主题映射、Provider 配置及表现层装配 | 请求业务数据、执行领域规则或维护业务状态 |

* 依赖流向保持为：**展示组件 → 页面 Composable → API / 领域函数**；通用 UI 组件只依赖 Vue、Naive UI 与无业务的表现层工具，不反向依赖具体业务模块。
* 业务组件按领域词汇命名（如 `AssignmentList.vue`），接收只读 props，通过语义化事件（如 `confirm`、`select-referee`）表达意图；业务动作交由页面 Composable 编排，不能把 UI 库事件对象传入领域函数或 API。
* 表格列、筛选选项、状态文案/颜色和表单绑定属于表现层投影，放在组件或同业务目录的 `*.presentation.ts` 中；该文件可引用 UI 库类型，但不得发送请求、执行持久化或成为领域规则的唯一实现。Naive UI 专属类型不得泄漏到 DTO、领域模型、API 返回值或页面 Composable 的公开接口。

#### (2) 直接使用与封装策略

* **允许展示组件显式按需导入 Naive UI 基础组件**；不得为了“隔离框架”给每一个 `NButton`、`NCard` 建立无差别透传包装。优先复用库提供的焦点、禁用态、模态语义等交互能力。
* 只有存在跨页面重复的产品交互约定、统一可访问性要求或组件库适配差异时，才在 `src/components/ui/` 建立封装（如 `UiConfirmDialog.vue`），以最小 props、emits 和必要 slots 暴露稳定接口，不复制整套第三方 API。
* 带领域语义的列表、状态标识、比赛面板等保留在所属业务模块。单页面组件先放入 `views/<feature>/components/`，不得因“可能复用”提前放入通用 UI 层；后续跨业务复用仍需明确所有者，不得页面之间互相引用。
* 通用 UI 组件同样遵守本章的 `.vue` 单文件行数上限；封装不得成为绕过 40 行状态逻辑抽离规则的容器。局部焦点、展开/收起等纯交互逻辑可以留在组件内，复杂的库适配可提取到 `src/components/ui/` 内的 `useUi*.ts`，不得混入业务 Composable。
* UI 框架依赖只声明在实际使用的前端应用中，不提升到 `contracts`、`domain` 或 API。保持显式按需导入，禁止全量全局注册、导入库私有内部路径或未经决策引入自动组件扫描插件；新增其他 UI 组件库或改变共享方式前先评估产物与维护成本并记录 ADR。

#### (3) 主题、样式与 Provider

* 当前主题入口为 `apps/referee-web/src/ui-theme.ts`，使用 `GlobalThemeOverrides` 集中映射共享 UI 规范；全局 CSS 变量必须与主题保持同一语义和取值，不得另立一套视觉 token。主题增长时可按组件拆分适配文件，但必须由同一入口导出。
* `NConfigProvider` 在应用根部统一装配；`NMessageProvider`、`NDialogProvider` 等按实际需求在表现层接入，不得在业务页面重复配置全局主题，也不得在模块顶层创建脱离根主题的全局通知/弹框实例。
* 颜色、字体、圆角、阴影、触控尺寸和通用交互状态优先通过主题与通用 UI 封装统一实现。页面仅处理布局和明确的展示差异，禁止散落重复的 `theme-overrides` 或为单页发明新 token。
* 优先使用库公开的 props、slots 与主题接口；不得默认依赖 `.n-*` 内部结构、深层选择器或 `!important` 修补样式。确有公开接口无法覆盖的缺口时，将覆盖集中在适配层，注明原因与兼容风险，并在升级时回归验证。
* 第三方组件的默认配色、按钮形状及状态不视为已符合项目规范；移动优先密度、至少 44×44 CSS px 的触控目标、可见键盘焦点、可访问名称、弹窗焦点恢复和 reduced-motion 均需实际验证。可访问性或业务操作密度与视觉示例冲突时，按根级 `AGENTS.md` 的优先级处理，并在相关规格记录窄范围例外，不机械套用营销页的大留白。

#### (4) 表单、反馈与业务规则

* Naive UI 表单规则仅承担必填、格式及字段级交互反馈。资格、时间冲突、计时转换、规则集等业务不变量仍由领域纯函数定义；服务端对受保护操作独立执行授权与校验。输入组件的 `min` / `max`、禁用按钮或隐藏操作不能替代这些规则。
* 页面 Composable 对外提供加载、提交、错误、结果等与组件库无关的状态。`useMessage`、`useDialog`、`FormInst`、`FormRules` 等库适配只允许位于展示组件、表现层投影或 `components/ui/` 内的纯 UI 适配中，不得为了弹提示让业务状态层依赖 UI 框架。
* 展示组件可以调用表单实例进行交互校验，校验通过后以表单值/语义事件交给页面 Composable；不得把表单实例作为业务提交函数的参数，也不得将带渲染函数或响应式引用的 UI 对象作为 API Payload。
* 异步操作明确区分加载、空数据、失败、陈旧/离线与待同步状态，提供可见反馈与重试入口；不将网络异常伪装成空列表，不仅靠颜色或短暂 toast 表达错误。提交期间防止重复触发，失败保留可恢复输入；未获服务端确认的离线操作不得提示为已完成，UI 库也不得自行承担缓存或同步职责。
* 删除、清空及其他破坏性操作通过清晰的确认流程触发语义化业务命令；UI 确认框仅负责交互，不承担授权，也不绕过规格要求的理由、二次确认或审计。

#### (5) 测试与升级检查

* 领域规则与页面状态测试不挂载 UI 库或加载整套应用；对 API 使用边界替身，保证纯领域测试不依赖 DOM。新增通用 UI 封装只测试自有行为（props/emits、禁用/加载、确认/取消和可访问性），不重复测试组件库内部实现。
* 焦点管理、键盘操作、移动布局、弱网反馈与主题一致性在独立浏览器/集成检查中验证，不并入低内存纯逻辑单测；单测继续遵守低于 300 MB 的项目预算。
* 接入、升级或新增组件后执行相关单测、`typecheck` 与生产构建，并比较构建产物变化；不得因使用 UI 框架增加生产期前端服务、远程组件 CDN 或敏感数据缓存。

## 四、标准代码模板基准

AI 与开发者在生成新代码时，必须对照以下基准模板：

### 1. 后端标准范例

#### (1) `src/modules/assignment/assignment.schema.ts`

```
import { Type } from '@sinclair/typebox';

export const AssignRefereeParamsSchema = Type.Object({
  matchId: Type.String({ format: 'uuid' }),
});

export const AssignRefereeBodySchema = Type.Object({
  refereeId: Type.String({ format: 'uuid' }),
  role: Type.Union([Type.Literal('LEAD'), Type.Literal('CREW_CHIEF')]),
});

export const AssignmentResponseSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  matchId: Type.String({ format: 'uuid' }),
  refereeId: Type.String({ format: 'uuid' }),
  status: Type.String(),
  createdAt: Type.String(),
});

```

#### (2) `src/modules/assignment/assignment.routes.ts`

```
import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import {
  AssignRefereeParamsSchema,
  AssignRefereeBodySchema,
  AssignmentResponseSchema,
} from './assignment.schema';
import { AssignmentService } from './assignment.service';

export const assignmentRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  const service = new AssignmentService();

  fastify.post(
    '/:matchId/referees',
    {
      schema: {
        params: AssignRefereeParamsSchema,
        body: AssignRefereeBodySchema,
        response: { 201: AssignmentResponseSchema },
      },
    },
    async (request, reply) => {
      const { matchId } = request.params;
      const { refereeId, role } = request.body;
      const result = await service.assignRefereeToMatch(matchId, refereeId, role);
      return reply.code(201).send(result);
    }
  );
};

```

#### (3) `src/modules/assignment/assignment.service.ts`

```
import { AssignmentRepository } from './assignment.repository';
import { AssignmentDTO } from '@refs-tools/contracts';

export class AssignmentService {
  constructor(private repo = new AssignmentRepository()) {}

  async assignRefereeToMatch(
    matchId: string,
    refereeId: string,
    role: string
  ): Promise<AssignmentDTO> {
    const existing = await this.repo.findByMatchAndReferee(matchId, refereeId);
    if (existing) {
      throw new Error('REFEREE_ALREADY_ASSIGNED');
    }

    return await this.repo.createAssignment({
      matchId,
      refereeId,
      role,
      status: 'PENDING_CONFIRMATION',
    });
  }
}

```

#### (4) `src/modules/assignment/assignment.repository.ts`

```
import { db } from '../../database';
import { AssignmentDTO } from '@refs-tools/contracts';

export class AssignmentRepository {
  async findByMatchAndReferee(matchId: string, refereeId: string): Promise<AssignmentDTO | null> {
    const query = `
      SELECT id, match_id as "matchId", referee_id as "refereeId", status, created_at as "createdAt"
      FROM match_assignments
      WHERE match_id = $1 AND referee_id = $2
      LIMIT 1
    `;
    const result = await db.query(query, [matchId, refereeId]);
    return result.rows[0] || null;
  }

  async createAssignment(data: Omit<AssignmentDTO, 'id' | 'createdAt'>): Promise<AssignmentDTO> {
    const query = `
      INSERT INTO match_assignments (match_id, referee_id, role, status)
      VALUES ($1, $2, $3, $4)
      RETURNING id, match_id as "matchId", referee_id as "refereeId", status, created_at as "createdAt"
    `;
    const result = await db.query(query, [data.matchId, data.refereeId, data.role, data.status]);
    return result.rows[0];
  }
}

```

### 2. 前端标准范例

#### (1) `src/api/assignment.api.ts`

```
import { http } from '@/utils/http';
import type { AssignmentDTO, AssignRefereeRequest } from '@refs-tools/contracts';

export const assignmentApi = {
  assignReferee(matchId: string, payload: AssignRefereeRequest): Promise<AssignmentDTO> {
    return http.post(`/api/assignments/${matchId}/referees`, payload);
  },
  getAssignmentsByMatch(matchId: string): Promise<AssignmentDTO[]> {
    return http.get(`/api/assignments/${matchId}/referees`);
  },
};

```

#### (2) `src/views/assignment/useAssignment.ts`

```
import { ref } from 'vue';
import { assignmentApi } from '@/api/assignment.api';
import type { AssignmentDTO } from '@refs-tools/contracts';

export function useAssignment(matchId: string) {
  const assignments = ref<AssignmentDTO[]>([]);
  const loading = ref(false);
  const errorMessage = ref<string | null>(null);

  async function loadAssignments() {
    loading.value = true;
    errorMessage.value = null;
    try {
      assignments.value = await assignmentApi.getAssignmentsByMatch(matchId);
    } catch (err: any) {
      errorMessage.value = err.message || '加载指派失败';
    } finally {
      loading.value = false;
    }
  }

  return {
    assignments,
    loading,
    errorMessage,
    loadAssignments,
  };
}

```

#### (3) `src/views/assignment/AssignmentView.vue`

```
<script setup lang="ts">
import { onMounted } from 'vue';
import { useAssignment } from './useAssignment';
import AssignmentList from './components/AssignmentList.vue';

const props = defineProps<{ matchId: string }>();
const { assignments, loading, errorMessage, loadAssignments } = useAssignment(props.matchId);

onMounted(() => {
  loadAssignments();
});
</script>

<template>
  <div class="assignment-view p-6">
    <header class="flex justify-between items-center mb-4">
      <h1 class="text-xl font-bold">裁判选派管理</h1>
    </header>

    <div v-if="loading" class="text-gray-500">正在获取排班数据...</div>
    <div v-else-if="errorMessage" class="text-red-500">{{ errorMessage }}</div>
    <AssignmentList v-else :items="assignments" />
  </div>
</template>

```

## 五、AI 开发执行协议与自检清单

当指派给 AI 任何新的开发或修复任务时，AI **必须按以下步骤逐步生成代码，禁止单次全量揉合生成**：

### 1. 标准执行顺序（5 步工作流）

1. **Step 1 - 契约先行**：优先在 `packages/contracts` 中声明 TypeBox Schema 与 TypeScript DTO 接口。若涉及核心业务规则（如资格打分、时间冲突判定），在 `packages/domain` 中编写纯函数并补全单元测试。

2. **Step 2 - 数据库持久层**：在 `apps/api/src/modules/<feature>/<feature>.repository.ts` 中实现 SQL 数据操作。

3. **Step 3 - 业务编排层**：在 `apps/api/src/modules/<feature>/<feature>.service.ts` 中组装流程、规则校验及异常抛出。

4. **Step 4 - 路由接入层**：在 `apps/api/src/modules/<feature>/<feature>.routes.ts` 挂载端点并指定 schema 校验。

5. **Step 5 - 前端组件化交付**：按需在 `apps/referee-web/src/api/` 写入 API 映射，在对应 `views/<feature>/` 下拆分 `use<Feature>.ts` 与单视图组件。按第三章的边界接入 Naive UI，先复用集中主题与既有组件，仅将确有通用需求的封装放入 `components/ui/`；完成相关交互与构建检查。

仅涉及 UI 的任务不必机械新增契约、领域模型或后端五文件；先确认是否改变业务规则或跨端载荷，再执行实际涉及的步骤。

### 2. 交付前自检清单（必须逐条通过）

* \[ \] 后端是否有任何 SQL 查询写在了 `routes.ts` 或 `service.ts` 中？（如有，必须下沉至 `repository.ts`）

* \[ \] 单个 `.vue` 文件总行数是否超过第三章规定的统一上限？（如超过，必须拆分子组件）

* \[ \] 前端 `.vue` 的 `<script setup>` 中是否含有直接的 HTTP 请求？（如有，必须抽至 `api/*.ts`）

* \[ \] 跨端传输的数据接口是否在 `packages/contracts` 中统一定义？

* \[ \] 每一个新建的 `domain` 规则和 `service` 是否包含配套的 Vitest 单元测试？

* \[ \] Naive UI 是否只被表现层/主题适配使用，未进入 `contracts`、领域模块、API 或业务 Composable？组件库类型是否留在表现层？

* \[ \] 组件封装是否确有通用需求且不包含业务逻辑？业务组件是否仍归属对应模块，无跨应用/跨页面目录引用？

* \[ \] 主题是否集中维护并符合共享 FIBA UI 规范，无逐页重复 token、全量组件注册或未说明的内部样式覆盖？

* \[ \] 表单交互校验、领域不变量与 API 授权是否各归其位？加载、错误、离线、重试及破坏性操作确认是否符合相关规格？

* \[ \] 涉及 UI 时，是否检查移动端触控、键盘/焦点、可访问名称、reduced-motion 与主题状态，并执行相关单测、`typecheck` 和生产构建？未涉及项标明不适用，无法执行的检查须说明原因。