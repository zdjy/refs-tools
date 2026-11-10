<script setup lang="ts">
  /**
   * 删除文件弹窗：删除入口在列表行内，理由与确认在本弹窗完成。
   *
   * 删除会先撤销访问再删除存储对象，且服务端要求理由并写审计，
   * 因此不使用行内气泡确认，改为独立的单步确认弹窗（FS-0010 v2 §5.2 例外说明见 FS-0034）。
   */
  import { NButton, NFormItem, NInput } from 'naive-ui';
  import type { AdminMedia } from '@refs-tools/contracts/admin-media';
  import AdminDialogShell from '@/components/admin-shell/AdminDialogShell.vue';
  import AdminStateBanner from '@/components/admin-shell/AdminStateBanner.vue';
  import UiSubmitHint from '../../../../components/ui/UiSubmitHint.vue';

  defineProps<{
    show: boolean;
    file: AdminMedia | null;
    reason: string;
    busy: boolean;
    error: string;
    online: boolean;
  }>();
  defineEmits<{ close: []; confirm: []; 'update:reason': [value: string] }>();

  const fileName = (file: AdminMedia | null) => file?.fileName ?? file?.id ?? '';
</script>

<template>
  <AdminDialogShell
    :show="show"
    title="删除文件"
    size="sm"
    :busy="busy"
    @update:show="!$event && $emit('close')"
  >
    <AdminStateBanner v-if="!online" tone="warning" message="当前离线，删除未提交；填写内容暂时保留。" />
    <AdminStateBanner v-if="error" tone="danger" :message="error" />

    <p class="delete-lead">
      删除「{{ fileName(file) }}」会先撤销访问再删除存储对象，无法撤销；已核验的证据须由所属业务审批，服务端仍会独立拒绝。
    </p>

    <NFormItem label="删除理由" required>
      <NInput
        :value="reason"
        type="textarea"
        :maxlength="500"
        show-count
        :disabled="busy"
        :input-props="{ 'aria-label': '删除理由' }"
        placeholder="说明本次删除的必要性，请勿填写凭据或 URL"
        @update:value="$emit('update:reason', $event)"
      />
    </NFormItem>

    <template #footer>
      <UiSubmitHint :busy="busy" />
      <NButton :disabled="busy" @click="$emit('close')">取消</NButton>
      <NButton type="error" :loading="busy" :disabled="busy || !online" @click="$emit('confirm')">
        确认删除
      </NButton>
    </template>
  </AdminDialogShell>
</template>

<style scoped>
  .delete-lead {
    margin-bottom: var(--admin-space-lg);
    font-size: var(--admin-text-body-size);
    line-height: var(--admin-text-body-leading);
    color: var(--admin-body);
  }
</style>
