# 前端标准代码模板

本文件属于[全栈架构与编码规约](../coding-standards.md)。

AI 与开发者在生成新代码时，必须对照以下基准模板。下列为结构示意；业务字段、Schema、唯一约束与 DomainError 应按实际规格和模块实现，不将示例视为完整选派业务：

## (1) `src/api/assignment.api.ts`

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

## (2) `src/views/assignment/useAssignment.ts`

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
