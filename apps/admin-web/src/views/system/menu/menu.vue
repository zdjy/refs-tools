<template>
  <section class="page" aria-label="菜单权限管理">
    <AdminPage title="菜单权限管理">
      <template #badge>
        <AdminBadge tone="mock">Mock 数据</AdminBadge>
      </template>
    </AdminPage>
    <p class="mock-note">页面数据为 Mock 示例数据，非真实数据；权限模型接入后端后重做本页。</p>
    <div class="menu-layout">
      <MenuTreePanel
        :tree="treeData"
        :loading="loading"
        :pattern="pattern"
        :expanded="expandedKeys"
        :add-options="addMenuOptions"
        @add="selectAddMenu"
        @toggle-all="packHandle"
        @select="selectedTree"
        @update:pattern="pattern = $event"
        @update:expanded="expandedKeys = $event"
      />
      <MenuEditPanel
        :form="formParams"
        :rules="rules"
        :title="treeItemTitle"
        :visible="isEditMenu"
        :saving="subLoading"
        @update="Object.assign(formParams, $event)"
        @save="formSubmit"
        @reset="handleReset"
        @remove="handleDel"
      />
    </div>
    <CreateDrawer ref="createDrawerRef" :title="drawerTitle" />
  </section>
</template>

<script lang="ts" setup>
  import { ref, unref, reactive, onMounted, computed } from 'vue';
  import { useMessage } from 'naive-ui';
  import AdminPage from '@/components/admin-shell/AdminPage.vue';
  import AdminBadge from '@/components/admin-shell/AdminBadge.vue';
  import { getMenuList } from '@/api/system/menu';
  import { getTreeItem } from '@/utils';
  import CreateDrawer from './CreateDrawer.vue';
  import MenuTreePanel from './components/MenuTreePanel.vue';
  import MenuEditPanel from './components/MenuEditPanel.vue';
  import type { ListDate } from '@/api/system/menu';

  const rules = {
    label: { required: true, message: '请输入标题', trigger: 'blur' },
    path: { required: true, message: '请输入路径', trigger: 'blur' },
  };

  const createDrawerRef = ref();
  const message = useMessage();
  const treeItemKey = ref<string[]>([]);
  const expandedKeys = ref<string[]>([]);
  const treeData = ref<ListDate[]>([]);
  const loading = ref(true);
  const subLoading = ref(false);
  const isEditMenu = ref(false);
  const treeItemTitle = ref('');
  const pattern = ref('');
  const drawerTitle = ref('');
  const isAddSon = computed(() => !treeItemKey.value.length);
  const addMenuOptions = computed(() => [
    { label: '添加顶级菜单', key: 'home', disabled: false },
    { label: '添加子菜单', key: 'son', disabled: isAddSon.value },
  ]);

  const formParams = reactive({ type: 1, label: '', subtitle: '', path: '', auth: '', openType: 1 });

  function selectAddMenu(key: string) {
    drawerTitle.value = key === 'home' ? '添加顶栏菜单' : `添加子菜单：${treeItemTitle.value}`;
    createDrawerRef.value?.openDrawer();
  }

  function selectedTree(keys: string[]) {
    if (!keys.length) {
      isEditMenu.value = false;
      treeItemKey.value = [];
      treeItemTitle.value = '';
      return;
    }
    const treeItem = getTreeItem(unref(treeData), keys[0]);
    treeItemKey.value = keys;
    treeItemTitle.value = treeItem.label;
    Object.assign(formParams, treeItem);
    isEditMenu.value = true;
  }

  function handleDel() {
    // Mock 页没有真实后端：只给出明确反馈，不做假成功。
    message.info('Mock 页面不写入真实权限，删除未执行');
  }

  function handleReset() {
    Object.assign(formParams, getTreeItem(unref(treeData), treeItemKey.value[0]));
  }

  function formSubmit() {
    message.error('抱歉，您没有该权限');
  }

  function packHandle() {
    expandedKeys.value = expandedKeys.value.length ? [] : treeData.value.map((item) => item.key);
  }

  onMounted(async () => {
    const treeMenuList = await getMenuList();
    treeData.value = treeMenuList.list;
    loading.value = false;
  });
</script>

<style scoped>
  .page {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .mock-note {
    margin-bottom: var(--admin-space-lg);
    font-size: var(--admin-text-meta-size);
    color: var(--admin-muted);
  }

  .menu-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--admin-space-lg);
    align-items: start;
  }

  @media (min-width: 1100px) {
    .menu-layout {
      grid-template-columns: minmax(240px, 1fr) minmax(0, 2fr);
    }
  }
</style>
