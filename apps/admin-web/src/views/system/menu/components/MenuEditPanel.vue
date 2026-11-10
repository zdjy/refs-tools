<template>
  <NCard :segmented="{ content: true }" :bordered="false" size="small">
    <template #header>
      <NSpace>
        <NIcon size="18"><FormOutlined /></NIcon>
        <span>编辑菜单{{ title ? `：${title}` : '' }}</span>
      </NSpace>
    </template>
    <div class="edit-panel">
      <p class="edit-hint">从菜单列表选择一项后，进行编辑。删除属于破坏性操作，就地确认。</p>
      <NForm
        v-if="visible"
        :model="form"
        :rules="rules"
        label-placement="left"
        :label-width="88"
        @submit.prevent="emit('save')"
      >
        <NFormItem label="类型" path="type">
          <span class="edit-value">{{ form.type === 1 ? '侧边栏菜单' : '' }}</span>
        </NFormItem>
        <NFormItem label="标题" path="label">
          <NInput :value="form.label" placeholder="请输入标题" @update:value="emit('update', { label: $event })" />
        </NFormItem>
        <NFormItem label="副标题" path="subtitle">
          <NInput :value="form.subtitle" placeholder="请输入副标题" @update:value="emit('update', { subtitle: $event })" />
        </NFormItem>
        <NFormItem label="路径" path="path">
          <NInput :value="form.path" placeholder="请输入路径" @update:value="emit('update', { path: $event })" />
        </NFormItem>
        <NFormItem label="打开方式" path="openType">
          <NRadioGroup :value="form.openType" name="openType" @update:value="emit('update', { openType: $event })">
            <NSpace>
              <NRadio :value="1">当前窗口</NRadio>
              <NRadio :value="2">新窗口</NRadio>
            </NSpace>
          </NRadioGroup>
        </NFormItem>
        <NFormItem label="菜单权限" path="auth">
          <NInput :value="form.auth" placeholder="请输入权限，多个权限用逗号分割" @update:value="emit('update', { auth: $event })" />
        </NFormItem>
      </NForm>
    </div>

    <template #footer>
      <NSpace>
        <NButton type="primary" :loading="saving" :disabled="!visible" @click="emit('save')">保存修改</NButton>
        <NButton :disabled="!visible" @click="emit('reset')">重置</NButton>
        <AdminConfirmButton
          label="删除"
          message="删除该菜单后，对应路由将不可访问；Mock 页不会真正写入，只演示确认流程。"
          confirm-label="确认删除"
          :disabled="!visible"
          @confirm="emit('remove')"
        />
      </NSpace>
    </template>
  </NCard>
</template>

<script lang="ts" setup>
  /** 菜单编辑面板：字段只在 Mock 层维护，提交给出明确的无权限反馈。 */
  import {
    NButton,
    NCard,
    NForm,
    NFormItem,
    NIcon,
    NInput,
    NRadio,
    NRadioGroup,
    NSpace,
    type FormRules,
  } from 'naive-ui';
  import { FormOutlined } from '@vicons/antd';
  import AdminConfirmButton from '@/components/admin-shell/AdminConfirmButton.vue';

  export interface MenuForm {
    type: number;
    label: string;
    subtitle: string;
    path: string;
    auth: string;
    openType: number;
  }

  defineProps<{
    form: MenuForm;
    rules: FormRules;
    title: string;
    visible: boolean;
    saving: boolean;
  }>();
  const emit = defineEmits<{
    update: [value: Partial<MenuForm>];
    save: [];
    reset: [];
    remove: [];
  }>();
</script>

<style scoped>
  .edit-panel {
    display: flex;
    flex-direction: column;
    gap: var(--admin-space-md);
    padding-block: var(--admin-space-md);
    min-width: 0;
  }

  .edit-hint {
    font-size: var(--admin-text-meta-size);
    line-height: var(--admin-text-meta-leading);
    color: var(--admin-muted);
  }

  .edit-value {
    font-size: var(--admin-text-body-size);
    color: var(--admin-body);
  }
</style>
