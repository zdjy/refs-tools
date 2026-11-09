<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue';
import { NButton, NModal } from 'naive-ui';
import { useEvidence } from '../useEvidence';
const props = defineProps<{ recordId: string; ids: string[]; label: string; appealId?: string }>();
const e = useEvidence();
watch(() => props.recordId, e.close);
onBeforeUnmount(e.close);
</script>
<template>
  <section class="min-w-0 space-y-2">
    <h3 class="m-0 text-sm font-semibold">{{ label }}（{{ ids.length }}）</h3>
    <div class="flex flex-wrap gap-2">
      <NButton v-for="(id, index) in ids" :key="id" size="large" @click="e.open(recordId, id, appealId)">查看{{ label }} {{ index + 1 }}</NButton>
      <p v-if="!ids.length" class="m-0 text-admin-body">未提供材料。</p>
    </div>
    <NModal :show="!!e.mediaId.value" preset="card" :title="label" :style="{ width: 'min(900px, calc(100vw - 32px))' }" @update:show="!$event && e.close()">
      <p v-if="e.loading.value" role="status">正在获取材料读取授权…</p>
      <div v-if="e.error.value" role="alert"><p>{{ e.error.value }}</p><NButton size="large" @click="e.open(recordId, e.mediaId.value, appealId)">重新读取材料</NButton></div>
      <iframe v-if="e.url.value" :src="e.url.value" :title="`${label}预览`" referrerpolicy="no-referrer" class="h-[65vh] w-full border border-admin-line"></iframe>
    </NModal>
  </section>
</template>

<style scoped>
/* 材料按钮使用公开根元素补齐键盘轮廓，避免组件默认焦点不可见。 */
button:focus-visible { outline: 2px solid var(--admin-primary); outline-offset: 2px; }
</style>
