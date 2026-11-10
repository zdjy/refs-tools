<script setup lang="ts">
  /**
   * 审核决定弹窗：理由必填，破坏性决定在页脚就地确认（FS-0010 v2 §5.2）。
   */
  import { computed } from 'vue';
  import { NButton, NFormItem, NInput } from 'naive-ui';
  import type { CertificationAppealDecision, CertificationDecision } from '@refs-tools/contracts/certifications';
  import { decisionLabels } from '../certifications.presentation';
  import AdminDialogShell from '@/components/admin-shell/AdminDialogShell.vue';
  import AdminConfirmButton from '@/components/admin-shell/AdminConfirmButton.vue';
  import AdminStateBanner from '@/components/admin-shell/AdminStateBanner.vue';

  const props = defineProps<{
    decision: CertificationDecision['decision'] | CertificationAppealDecision['decision'] | null;
    applicant: string;
    reason: string;
    busy: boolean;
    error: string;
  }>();
  const emit = defineEmits<{
    'update:reason': [value: string];
    'update:decision': [value: null];
    decide: [];
  }>();

  const title = computed(() => (props.decision ? decisionLabels[props.decision] : '审核决定'));
  const destructive = computed(() => props.decision === 'revoke' || props.decision === 'reject');
  const message = computed(
    () => `确认对 ${props.applicant} 作出「${title.value}」决定？此操作会生成历史版本并记录审计。`
  );
</script>

<template>
  <AdminDialogShell
    :show="!!decision"
    :title="title"
    size="md"
    :busy="busy"
    @update:show="!$event && emit('update:decision', null)"
  >
    <div class="decision">
      <p class="decision-text">{{ message }}</p>
      <NFormItem label="决定理由">
        <NInput
          :value="reason"
          type="textarea"
          :maxlength="500"
          show-count
          :autosize="{ minRows: 4, maxRows: 8 }"
          :disabled="busy"
          :input-props="{ 'aria-label': '决定理由' }"
          placeholder="说明核验依据；补件请写清缺少的材料与修改要求"
          @update:value="emit('update:reason', $event)"
        />
      </NFormItem>
      <AdminStateBanner v-if="error" tone="danger" :message="error" />
    </div>

    <template #footer>
      <NButton :disabled="busy" @click="emit('update:decision', null)">取消</NButton>
      <AdminConfirmButton
        :tone="destructive ? 'danger' : 'primary'"
        :label="`确认${title}`"
        :message="message"
        :confirm-label="`确认${title}`"
        :loading="busy"
        :disabled="busy || !reason.trim()"
        @confirm="emit('decide')"
      />
    </template>
  </AdminDialogShell>
</template>

<style scoped>
  .decision {
    display: flex;
    flex-direction: column;
    gap: var(--admin-space-lg);
  }

  .decision-text {
    font-size: var(--admin-text-body-size);
    line-height: var(--admin-text-body-leading);
    color: var(--admin-ink);
  }
</style>
