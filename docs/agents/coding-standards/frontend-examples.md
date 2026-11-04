# 前端标准代码模板

本文件属于[全栈架构与编码规约](../coding-standards.md)。

AI 与开发者在生成新代码时，必须对照以下基准模板。下列为结构示意；业务字段、Schema、唯一约束与 DomainError 应按实际规格和模块实现，不将示例视为完整选派业务：

## (1) `src/api/assignment.api.ts`

网关是限界上下文的防腐层：经传输客户端发请求，把 `HttpError` 翻译为本上下文的错误类型。规则见[前端规约第 4 节](frontend.md#4-请求层alova-与-ddd-网关封装)。

```
import type { AssignmentDTO, AssignRefereeRequest } from '@refs-tools/contracts';
import { HttpError } from './http/errors';
import { createPlatformClient, type PlatformClient } from './http/platform-client';

/** 只暴露可识别错误码，不向状态层传递原始响应或异常。 */
export class AssignmentApiError extends Error {
  constructor(readonly code: string, readonly status: number) { super(code); }
}

function toAssignmentError(error: unknown): AssignmentApiError {
  if (!(error instanceof HttpError)) return new AssignmentApiError('SERVICE_UNAVAILABLE', 0);
  if (error.kind === 'network') return new AssignmentApiError('NETWORK_ERROR', 0);
  return new AssignmentApiError(error.code ?? 'SERVICE_UNAVAILABLE', error.status);
}

export function createAssignmentApi(client: PlatformClient) {
  const call = <T>(task: Promise<T>) => task.catch((error) => { throw toAssignmentError(error); });
  return {
    assignReferee: (matchId: string, payload: AssignRefereeRequest) =>
      call(client.post<AssignmentDTO>(`/assignments/${encodeURIComponent(matchId)}/referees`, payload)),
    getAssignmentsByMatch: (matchId: string) =>
      call(client.get<AssignmentDTO[]>(`/assignments/${encodeURIComponent(matchId)}/referees`)),
  };
}

export const assignmentApi = createAssignmentApi(createPlatformClient({ baseURL: '/api/v1' }));
export type AssignmentApi = typeof assignmentApi;

```

## (2) `src/views/assignment/useAssignment.ts`

```
import { ref } from 'vue';
import { assignmentApi, type AssignmentApi } from '@/api/assignment.api';
import type { AssignmentDTO } from '@refs-tools/contracts';

/** 网关以形参注入，单测传入替身即可，不依赖 alova 或网络。 */
export function useAssignment(matchId: string, api: AssignmentApi = assignmentApi) {
  const assignments = ref<AssignmentDTO[]>([]);
  const loading = ref(false);
  const errorMessage = ref<string | null>(null);

  async function loadAssignments() {
    loading.value = true;
    errorMessage.value = null;
    try {
      assignments.value = await api.getAssignmentsByMatch(matchId);
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

## (3) `src/views/assignment/AssignmentView.vue`

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

    <div v-if="loading" class="text-body">正在获取排班数据...</div>
    <div v-else-if="errorMessage" class="text-red-500">{{ errorMessage }}</div>
    <AssignmentList v-else :items="assignments" />
  </div>
</template>

```
