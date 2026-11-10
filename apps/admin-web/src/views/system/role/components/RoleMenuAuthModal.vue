<template>
  <AdminDialogShell :show="show" :title="title" size="lg" @update:show="!$event && emit('update:show', false)">
    <div class="auth">
      <p class="auth-hint">勾选该角色可访问的侧边栏菜单；提交后立即生效，并记录审计。</p>
      <NTree
        block-line
        cascade
        checkable
        :virtual-scroll="true"
        :data="tree as unknown as TreeOption[]"
        :expanded-keys="expandedKeys"
        :checked-keys="checkedKeys"
        class="auth-tree"
        @update:checked-keys="checkedKeys = $event as string[]"
        @update:expanded-keys="expandedKeys = $event as string[]"
      />
    </div>

    <template #footer>
      <NButton quaternary @click="packHandle">全部{{ expandedKeys.length ? '收起' : '展开' }}</NButton>
      <NButton quaternary @click="checkedAllHandle">全部{{ checkedAll ? '取消' : '选择' }}</NButton>
      <NButton type="primary" :loading="busy" @click="submit">提交</NButton>
    </template>
  </AdminDialogShell>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { NButton, NTree, type TreeOption } from 'naive-ui';
  import AdminDialogShell from '@/components/admin-shell/AdminDialogShell.vue';
  import { getTreeAll } from '@/utils';
  import type { ListDate } from '@/api/system/menu';

  const props = defineProps<{ show: boolean; title: string; tree: ListDate[]; initialKeys: string[]; busy: boolean }>();
  const emit = defineEmits<{ 'update:show': [value: boolean]; submit: [keys: string[]] }>();

  const checkedKeys = ref<string[]>([...props.initialKeys]);
  const expandedKeys = ref<string[]>([]);
  const checkedAll = ref(false);

  function packHandle() {
    expandedKeys.value = expandedKeys.value.length ? [] : props.tree.map((item) => item.key);
  }

  function checkedAllHandle() {
    if (checkedAll.value) {
      checkedKeys.value = [];
      checkedAll.value = false;
      return;
    }
    checkedKeys.value = getTreeAll(props.tree);
    checkedAll.value = true;
  }

  function submit() {
    emit('submit', checkedKeys.value);
    emit('update:show', false);
  }
</script>

<style scoped>
  .auth {
    display: flex;
    flex-direction: column;
    gap: var(--admin-space-lg);
    min-width: 0;
  }

  .auth-hint {
    font-size: var(--admin-text-meta-size);
    line-height: var(--admin-text-meta-leading);
    color: var(--admin-muted);
  }

  .auth-tree {
    max-height: 60vh;
    overflow: hidden;
  }
</style>
