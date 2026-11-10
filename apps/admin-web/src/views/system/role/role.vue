<template>
  <section class="page" aria-label="角色权限管理">
    <AdminPage title="角色权限管理">
      <template #badge>
        <AdminBadge tone="mock">Mock 数据</AdminBadge>
      </template>
    </AdminPage>
    <p class="mock-note">页面数据为 Mock 示例数据，非真实数据；权限模型接入后端后重做本页。</p>
    <n-card :bordered="false" class="mt-4 proCard">
      <BasicTable
        :columns="columns"
        :request="loadDataTable"
        :row-key="(row) => row.id"
        ref="actionRef"
        :actionColumn="actionColumn"
        @update:checked-row-keys="onCheckedRow"
      >
        <template #tableTitle>
          <n-button type="primary" @click="addRole">
            <template #icon>
              <n-icon>
                <PlusOutlined />
              </n-icon>
            </template>
            新增角色
          </n-button>
        </template>

        <template #action>
          <TableAction />
        </template>
      </BasicTable>
    </n-card>

    <RoleMenuAuthModal
      :show="showModal"
      :title="editRoleTitle"
      :tree="treeData"
      :initial-keys="checkedKeys"
      :busy="formBtnLoading"
      @update:show="showModal = $event"
      @submit="submitMenuAuth"
    />
    <CreateModal ref="createModalRef" />
    <EditModal ref="editModalRef" />
  </section>
</template>

<script lang="ts" setup>
  import { reactive, ref, unref, h, onMounted } from 'vue';
  import { useMessage } from 'naive-ui';
  import { BasicTable, TableAction } from '@/components/Table';
  import { getRoleList } from '@/api/system/role';
  import { getMenuList } from '@/api/system/menu';
  import { columns } from './columns';
  import { PlusOutlined } from '@vicons/antd';
  import AdminPage from '@/components/admin-shell/AdminPage.vue';
  import AdminBadge from '@/components/admin-shell/AdminBadge.vue';
  import CreateModal from './CreateModal.vue';
  import EditModal from './EditModal.vue';
  import RoleMenuAuthModal from './components/RoleMenuAuthModal.vue';
  import type { ListDate } from '@/api/system/menu';

  const message = useMessage();
  const actionRef = ref();
  const createModalRef = ref();
  const editModalRef = ref();
  const showModal = ref(false);
  const formBtnLoading = ref(false);
  const editRoleTitle = ref('');
  const treeData = ref<ListDate[]>([]);
  const checkedKeys = ref<string[]>(['console', 'step-form']);

  const params = reactive({
    name: 'NaiveAdmin',
  });

  const actionColumn = reactive({
    width: 250,
    title: '操作',
    key: 'action',
    fixed: 'right',
    render(record) {
      return h(TableAction, {
        style: 'button',
        actions: [
          {
            label: '菜单权限',
            onClick: handleMenuAuth.bind(null, record),
            // 根据业务控制是否显示 isShow 和 auth 是并且关系
            ifShow: () => {
              return true;
            },
            // 根据权限控制是否显示: 有权限，会显示，支持多个
            auth: ['basic_list'],
          },
          {
            label: '编辑',
            onClick: handleEdit.bind(null, record),
            ifShow: () => {
              return true;
            },
            auth: ['basic_list'],
          },
          {
            label: '删除',
            onClick: handleDelete.bind(null, record),
            // 根据业务控制是否显示 isShow 和 auth 是并且关系
            ifShow: () => {
              return true;
            },
            // 根据权限控制是否显示: 有权限，会显示，支持多个
            auth: ['basic_list'],
          },
        ],
      });
    },
  });

  const loadDataTable = async (res: any) => {
    const _params = {
      ...unref(params),
      ...res,
    };
    return await getRoleList(_params);
  };

  function addRole() {
    createModalRef.value.openModal();
  }

  function onCheckedRow(rowKeys: any[]) {
    console.log(rowKeys);
  }

  function reloadTable() {
    actionRef.value.reload();
  }

  function handleEdit(record: Recordable) {
    console.log('点击了编辑', record);
    // router.push({ name: 'basic-info', params: { id: record.id } });
    editModalRef.value.showModal(record);
  }

  function handleDelete(record: Recordable) {
    console.log('点击了删除', record);
    message.info('点击了删除');
  }

  function handleMenuAuth(record: Recordable) {
    editRoleTitle.value = `分配 ${record.name} 的菜单权限`;
    checkedKeys.value = record.menu_keys;
    showModal.value = true;
  }

  /** 菜单权限提交：Mock 页只演示确认反馈，真实权限由后端接入后重做。 */
  function submitMenuAuth(keys: string[]) {
    checkedKeys.value = keys;
    formBtnLoading.value = true;
    showModal.value = false;
    message.success('菜单权限已提交');
    reloadTable();
    formBtnLoading.value = false;
  }

  onMounted(async () => {
    const treeMenuList = await getMenuList();
    treeData.value = treeMenuList?.list;
  });
</script>

<style lang="less" scoped>
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
</style>
