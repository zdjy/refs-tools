<script setup lang="ts">
  import { computed, nextTick, ref } from 'vue';
  import { NAlert, NButton, NForm, NFormItem, NInput, NModal, NSelect, NSpace, NSpin, type FormInst, type FormRules } from 'naive-ui';
  import type { AdminUser } from '@refs-tools/contracts/admin-users';
  import { roleLabels, statusOptions } from '../users.presentation';
  import UiSubmitHint from '../../../../components/ui/UiSubmitHint.vue';

  const props = defineProps<{
    mode: 'create' | 'edit' | 'detail'; selected: AdminUser | null; loading: boolean; busy: boolean;
    ready: boolean; online: boolean; error: string; actorId?: string;
    form: { email: string; displayName: string; password: string; status: AdminUser['status'] };
  }>();
  const emit = defineEmits<{
    close: []; save: []; remove: []; retry: [];
    'update:form': [value: typeof props.form];
  }>();
  const formRef = ref<FormInst | null>(null), contentRef = ref<HTMLElement | null>(null);
  const title = computed(() => ({ create: '新增用户', edit: '编辑用户', detail: '用户详情' })[props.mode]);
  const rules = computed<FormRules>(() => ({
    email: { required: true, type: 'email', message: '请输入有效邮箱', trigger: ['blur', 'input'] },
    displayName: { required: true, validator: (_, value: string) => !!value?.trim(), message: '请输入显示名称', trigger: 'blur' },
    password: { required: props.mode === 'create', message: '请输入初始密码', trigger: 'blur' },
  }));
  function update<K extends keyof typeof props.form>(key: K, value: typeof props.form[K]) {
    emit('update:form', { ...props.form, [key]: value });
  }
  async function submit() {
    try { await formRef.value?.validate(); emit('save'); }
    catch {
      await nextTick();
      const field = !props.form.email.includes('@') ? '邮箱' : !props.form.displayName.trim() ? '显示名称' : '初始密码';
      contentRef.value?.querySelector<HTMLInputElement>(`input[aria-label="${field}"]`)?.focus();
    }
  }
</script>

<template>
  <NModal :show="true" preset="card" :title="title" :style="{ width: 'min(560px, calc(100vw - 32px))' }"
    :mask-closable="!busy" :close-on-esc="!busy" :closable="!busy" @update:show="emit('close')">
    <NAlert v-if="error" type="error" class="mb-4" title="操作未完成" role="alert">
      {{ error }}
      <NButton v-if="mode !== 'create'" size="large" :disabled="loading" @click="emit('retry')">重新读取</NButton>
    </NAlert>
    <NAlert v-if="!online" type="warning" class="mb-4">当前离线，无法提交；输入暂时保留。</NAlert>
    <div ref="contentRef"><NSpin :show="loading">
      <dl v-if="mode === 'detail' && selected && ready" class="m-0 grid grid-cols-1 gap-3 break-all">
        <div><dt>用户 ID</dt><dd class="m-0">{{ selected.id }}</dd></div>
        <div><dt>显示名称</dt><dd class="m-0">{{ selected.displayName }}</dd></div>
        <div><dt>邮箱</dt><dd class="m-0">{{ selected.email }}（{{ selected.emailVerified ? '已验证' : '未验证' }}）</dd></div>
        <div><dt>账号状态</dt><dd class="m-0">{{ selected.status === 'active' ? '正常' : '已停用' }}</dd></div>
        <div><dt>当前平台角色</dt><dd class="m-0">{{ selected.roles.map(role => roleLabels[role] ?? role).join('、') || '普通用户' }}</dd></div>
        <div><dt>创建时间</dt><dd class="m-0">{{ new Date(selected.createdAt).toLocaleString() }}</dd></div>
      </dl>
      <NForm v-else ref="formRef" :model="form" :rules="rules" :disabled="busy || loading || !ready" size="large"
        @submit.prevent="submit">
        <NFormItem label="邮箱" path="email">
          <NInput :value="form.email" :disabled="mode !== 'create'" :maxlength="254"
            :input-props="{ 'aria-label': '邮箱', autocomplete: 'email' }" @update:value="update('email', $event)" />
        </NFormItem>
        <NFormItem label="显示名称" path="displayName">
          <NInput :value="form.displayName" :maxlength="80" :input-props="{ 'aria-label': '显示名称' }" @update:value="update('displayName', $event)" />
        </NFormItem>
        <NFormItem v-if="mode === 'create'" label="初始密码" path="password">
          <NInput :value="form.password" type="password" show-password-on="click" :maxlength="128"
            :input-props="{ autocomplete: 'new-password', 'aria-label': '初始密码' }" @update:value="update('password', $event)" />
        </NFormItem>
        <NFormItem v-else label="账号状态" path="status">
          <NSelect :value="form.status" :options="statusOptions" aria-label="账号状态" @update:value="update('status', $event)" />
        </NFormItem>
        <p class="mt-0 text-sm">{{ mode === 'create' ? '创建后需通过邮箱验证码验证身份。初始密码不符合要求时会显示具体提示。' : '停用会撤销全部会话。邮箱与角色需通过各自的验证、授权流程维护。' }}</p>
      </NForm>
    </NSpin></div>
    <template #footer>
      <UiSubmitHint :busy="busy" class="mb-3 text-right" />
      <NSpace justify="end">
        <NButton v-if="mode === 'edit'" type="error" size="large" :disabled="busy || !ready || !online || selected?.id === actorId"
          @click="emit('remove')">删除用户</NButton>
        <NButton size="large" :disabled="busy" @click="emit('close')">关闭</NButton>
        <NButton v-if="mode !== 'detail'" type="primary" size="large" :loading="busy" :disabled="loading || !ready || !online"
          @click="submit">保存</NButton>
      </NSpace>
    </template>
  </NModal>
</template>
