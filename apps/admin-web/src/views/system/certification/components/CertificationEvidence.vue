<script setup lang="ts">
  /** 材料证据：按需申请短时读取授权，在弹窗内预览；不在弹窗上再叠弹窗。 */
  import { onBeforeUnmount, watch } from 'vue';
  import { NButton } from 'naive-ui';
  import { useEvidence } from '../useEvidence';
  import AdminDialogShell from '@/components/admin-shell/AdminDialogShell.vue';

  const props = defineProps<{ recordId: string; ids: string[]; label: string; appealId?: string }>();
  const e = useEvidence();
  watch(() => props.recordId, e.close);
  onBeforeUnmount(e.close);
</script>

<template>
  <section class="evidence">
    <h3 class="evidence-title">{{ label }}（{{ ids.length }}）</h3>
    <div class="evidence-actions">
      <NButton v-for="(id, index) in ids" :key="id" @click="e.open(recordId, id, appealId)">
        查看{{ label }} {{ index + 1 }}
      </NButton>
      <p v-if="!ids.length" class="evidence-empty">未提供材料。</p>
    </div>

    <AdminDialogShell :show="!!e.mediaId.value" :title="label" size="lg" @update:show="!$event && e.close()">
      <p v-if="e.loading.value" role="status" class="evidence-status">正在获取材料读取授权…</p>
      <div v-if="e.error.value" class="evidence-error" role="alert">
        <p>{{ e.error.value }}</p>
        <NButton @click="e.open(recordId, e.mediaId.value, appealId)">重新读取材料</NButton>
      </div>
      <iframe
        v-if="e.url.value"
        :src="e.url.value"
        :title="`${label}预览`"
        referrerpolicy="no-referrer"
        class="evidence-frame"
      ></iframe>
    </AdminDialogShell>
  </section>
</template>

<style scoped>
  .evidence {
    display: flex;
    flex-direction: column;
    gap: var(--admin-space-sm);
    min-width: 0;
  }

  .evidence-title {
    font-size: var(--admin-text-meta-size);
    line-height: var(--admin-text-meta-leading);
    font-weight: var(--admin-text-table-head-weight);
    color: var(--admin-body);
  }

  .evidence-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--admin-space-md);
  }

  .evidence-empty,
  .evidence-status {
    font-size: var(--admin-text-body-size);
    line-height: var(--admin-text-body-leading);
    color: var(--admin-body);
  }

  .evidence-error {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--admin-space-md);
    font-size: var(--admin-text-body-size);
    color: var(--admin-danger-hover);
  }

  .evidence-frame {
    width: 100%;
    height: 65vh;
    border: 1px solid var(--admin-line);
    border-radius: var(--admin-radius-md);
  }
</style>
