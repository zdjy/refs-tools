<script setup lang="ts">
  import { computed, nextTick, ref } from 'vue';
  import { NButton, NForm, NFormItem, NInput, NSelect, NSpin, type FormInst, type FormRules } from 'naive-ui';
  import type { AdminUser } from '@refs-tools/contracts/admin-users';
  import { roleLabels, statusOptions } from '../users.presentation';
  import AdminDialogShell from '@/components/admin-shell/AdminDialogShell.vue';
  import AdminConfirmButton from '@/components/admin-shell/AdminConfirmButton.vue';
  import AdminStateBanner from '@/components/admin-shell/AdminStateBanner.vue';
  import UiSubmitHint from '../../../../components/ui/UiSubmitHint.vue';

  const props = defineProps<{
    mode: 'create' | 'edit' | 'detail';
    selected: AdminUser | null;
    loading: boolean;
    busy: boolean;
    ready: boolean;
    online: boolean;
    error: string;
    actorId?: string;
    form: { email: string; displayName: string; password: string; status: AdminUser['status'] };
  }>();
  const emit = defineEmits<{
    close: [];
    save: [confirmed: boolean];
    remove: [];
    retry: [];
    'update:form': [value: typeof props.form];
  }>();

  const formRef = ref<FormInst | null>(null);
  const contentRef = ref<HTMLElement | null>(null);
  const disableConfirmRef = ref<{ focus: () => void } | null>(null);

  const title = computed(() => ({ create: '新增用户', edit: '编辑用户', detail: '用户详情' })[props.mode]);
  const roleText = computed(
    () => props.selected?.roles.map((role) => roleLabels[role] ?? role).join('、') || '普通用户'
  );
  const createdText = computed(() =>
    props.selected ? new Date(props.selected.createdAt).toLocaleString() : ''
  );
  // 停用是破坏性操作：状态改成停用后，保存按钮就地改成确认按钮，
  // 不在弹窗上再叠一层确认弹窗（FS-0010 v2 §5.2）。
  const needsDisableConfirm = computed(
    () => props.mode === 'edit' && props.form.status === 'disabled' && props.selected?.status === 'active'
  );

  const rules = computed<FormRules>(() => ({
    email: { required: true, type: 'email', message: '请输入有效邮箱', trigger: ['blur', 'input'] },
    displayName: {
      required: true,
      validator: (_, value: string) => !!value?.trim(),
      message: '请输入显示名称',
      trigger: 'blur',
    },
    password: { required: props.mode === 'create', message: '请输入初始密码', trigger: 'blur' },
  }));

  function update<K extends keyof typeof props.form>(key: K, value: typeof props.form[K]) {
    emit('update:form', { ...props.form, [key]: value });
  }

  async function submit() {
    try {
      await formRef.value?.validate();
      if (needsDisableConfirm.value) {
        // 本地输入无法绕过停用确认：把焦点交给页脚的就地确认按钮。
        disableConfirmRef.value?.focus();
        return;
      }
      emit('save', false);
    } catch {
      await nextTick();
      const field = !props.form.email.includes('@')
        ? '邮箱'
        : !props.form.displayName.trim()
          ? '显示名称'
          : '初始密码';
      contentRef.value?.querySelector<HTMLInputElement>(`input[aria-label="${field}"]`)?.focus();
    }
  }
</script>

<template>
  <AdminDialogShell :show="true" :title="title" size="md" :busy="busy" @update:show="emit('close')">
    <AdminStateBanner
      v-if="error"
      tone="danger"
      :message="error"
      action="重新读取"
      @action="emit('retry')"
    />
    <AdminStateBanner v-if="!online" tone="warning" message="当前离线，无法提交；输入暂时保留。" />

    <div ref="contentRef">
      <NSpin :show="loading">
        <NForm
          ref="formRef"
          :model="form"
          :rules="rules"
          :disabled="busy || loading || !ready || mode === 'detail'"
          size="medium"
          label-placement="top"
          @submit.prevent="submit"
        >
          <NFormItem v-if="mode !== 'create'" label="用户 ID">
            <NInput :value="selected?.id ?? ''" disabled :input-props="{ 'aria-label': '用户 ID' }" />
          </NFormItem>
          <NFormItem label="邮箱" path="email">
            <NInput
              :value="form.email"
              :disabled="mode !== 'create'"
              :maxlength="254"
              :input-props="{ 'aria-label': '邮箱', autocomplete: 'email' }"
              @update:value="update('email', $event)"
            />
          </NFormItem>
          <NFormItem v-if="mode !== 'create'" label="邮箱验证">
            <NInput
              :value="selected?.emailVerified ? '已验证' : '未验证'"
              disabled
              :input-props="{ 'aria-label': '邮箱验证' }"
            />
          </NFormItem>
          <NFormItem label="显示名称" path="displayName">
            <NInput
              :value="form.displayName"
              :maxlength="80"
              :input-props="{ 'aria-label': '显示名称' }"
              @update:value="update('displayName', $event)"
            />
          </NFormItem>
          <NFormItem v-if="mode === 'create'" label="初始密码" path="password">
            <NInput
              :value="form.password"
              type="password"
              show-password-on="click"
              :maxlength="128"
              :input-props="{ autocomplete: 'new-password', 'aria-label': '初始密码' }"
              @update:value="update('password', $event)"
            />
          </NFormItem>
          <NFormItem v-else label="账号状态" path="status">
            <NSelect
              :value="form.status"
              :options="statusOptions"
              aria-label="账号状态"
              @update:value="update('status', $event)"
            />
          </NFormItem>
          <NFormItem v-if="mode === 'detail'" label="当前平台角色">
            <NInput :value="roleText" disabled :input-props="{ 'aria-label': '当前平台角色' }" />
          </NFormItem>
          <NFormItem v-if="mode === 'detail'" label="创建时间">
            <NInput :value="createdText" disabled :input-props="{ 'aria-label': '创建时间' }" />
          </NFormItem>

          <p class="form-note">
            {{
              mode === 'create'
                ? '创建后需通过邮箱验证码验证身份。初始密码不符合要求时会显示具体提示。'
                : mode === 'detail'
                  ? '邮箱、平台角色与账号生命周期需通过各自的验证、授权流程维护；此处的只读字段不可编辑。'
                  : '停用会撤销全部会话。邮箱与角色需通过各自的验证、授权流程维护。'
            }}
          </p>
        </NForm>
      </NSpin>
    </div>

    <template #footer>
      <UiSubmitHint :busy="busy" />
      <AdminConfirmButton
        v-if="mode === 'edit'"
        class="footer-danger"
        label="删除用户"
        :message="`删除 ${selected?.email ?? '该用户'} 后将撤销全部会话，邮箱不释放，历史记录保留。`"
        confirm-label="确认删除"
        :disabled="busy || !ready || !online || selected?.id === actorId"
        @confirm="emit('remove')"
      />
      <NButton :disabled="busy" @click="emit('close')">关闭</NButton>
      <AdminConfirmButton
        v-if="mode !== 'detail' && needsDisableConfirm"
        ref="disableConfirmRef"
        tone="primary"
        label="保存"
        message="停用后该用户将无法登录，全部现有会话立即失效。"
        confirm-label="确认停用"
        :loading="busy"
        :disabled="loading || !ready || !online"
        @confirm="emit('save', true)"
      />
      <NButton
        v-else-if="mode !== 'detail'"
        type="primary"
        :loading="busy"
        :disabled="loading || !ready || !online"
        @click="submit"
      >
        保存
      </NButton>
    </template>
  </AdminDialogShell>
</template>

<style scoped>
  .form-note {
    margin-top: var(--admin-space-md);
    font-size: var(--admin-text-meta-size);
    line-height: var(--admin-text-meta-leading);
    color: var(--admin-muted);
  }

  .footer-danger {
    margin-right: auto;
  }
</style>
