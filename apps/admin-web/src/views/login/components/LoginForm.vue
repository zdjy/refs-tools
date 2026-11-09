<script setup lang="ts">
  import { nextTick, onMounted, ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useMessage } from 'naive-ui';
  import type { InputInst } from 'naive-ui';
  import { useUserStore } from '@/store/modules/user';
  import { useUiFeedback } from '@/components/ui/useUiFeedback';
  import UiSubmitHint from '@/components/ui/UiSubmitHint.vue';
  import { useLogin } from '../useLogin';

  const emit = defineEmits<{ success: [] }>();
  const { t } = useI18n();
  const message = useMessage();
  const userStore = useUserStore();
  const { mode, fields, errors, loading, sending, busy, error, notice, sendCode, submit } = useLogin(userStore.applyUser, t);
  const emailRef = ref<InputInst | null>(null);
  const passwordRef = ref<InputInst | null>(null);
  const codeRef = ref<InputInst | null>(null);
  const errorRef = ref<HTMLElement | null>(null);
  useUiFeedback(notice);

  async function focusError() {
    await nextTick();
    if (errors.email) emailRef.value?.focus();
    else if (errors.password) passwordRef.value?.focus();
    else if (errors.code) codeRef.value?.focus();
    else errorRef.value?.focus();
  }
  async function handleSend() { if (!await sendCode()) focusError(); }
  async function handleSubmit() {
    if (await submit()) {
      message.success(t('login.loginSuccess'));
      emit('success');
    } else focusError();
  }
  onMounted(() => emailRef.value?.focus());
</script>

<template>
  <div class="mb-6 grid grid-cols-2 gap-2" role="group" :aria-label="t('login.method')">
    <n-button size="large" :type="mode === 'password' ? 'primary' : 'default'" :aria-pressed="mode === 'password'" :disabled="busy" @click="mode = 'password'">
      {{ t('login.passwordLogin') }}
    </n-button>
    <n-button size="large" :type="mode === 'code' ? 'primary' : 'default'" :aria-pressed="mode === 'code'" :disabled="busy" @click="mode = 'code'">
      {{ t('login.codeLogin') }}
    </n-button>
  </div>
  <n-form size="large" :show-require-mark="false" @submit.prevent="handleSubmit">
    <n-form-item :label="t('login.emailLabel')" :validation-status="errors.email ? 'error' : undefined" :feedback="errors.email">
      <n-input ref="emailRef" v-model:value="fields.email" :disabled="busy" :placeholder="t('login.usernamePlaceholder')" :input-props="{ 'aria-label': t('login.emailLabel'), 'aria-invalid': !!errors.email, inputmode: 'email', autocomplete: 'username' }" />
    </n-form-item>
    <n-form-item v-if="mode === 'password'" :label="t('login.passwordLabel')" :validation-status="errors.password ? 'error' : undefined" :feedback="errors.password">
      <n-input ref="passwordRef" v-model:value="fields.password" :disabled="busy" type="password" show-password-on="click" :placeholder="t('login.passwordPlaceholder')" :input-props="{ 'aria-label': t('login.passwordLabel'), 'aria-invalid': !!errors.password, autocomplete: 'current-password' }" />
    </n-form-item>
    <template v-else>
      <n-form-item :label="t('login.codeLabel')" :validation-status="errors.code ? 'error' : undefined" :feedback="errors.code">
        <div class="flex w-full min-w-0 flex-col gap-2 sm:flex-row">
          <n-input ref="codeRef" v-model:value="fields.code" class="min-w-0 sm:flex-1" :disabled="busy" :placeholder="t('login.codePlaceholder')" :input-props="{ 'aria-label': t('login.codeLabel'), 'aria-invalid': !!errors.code, inputmode: 'numeric', autocomplete: 'one-time-code' }" :maxlength="6" />
          <n-button size="large" :loading="sending" :disabled="busy" @click="handleSend">
            {{ t('login.sendCode') }}
          </n-button>
        </div>
      </n-form-item>
    </template>
    <p v-if="notice" role="status" class="mb-4 mt-0 text-sm">{{ notice }}</p>
    <p v-if="error" ref="errorRef" role="alert" tabindex="-1" class="mb-4 mt-0 text-sm">{{ error }}</p>
    <UiSubmitHint :busy="busy" />
    <n-button class="mt-2" type="primary" size="large" block attr-type="submit" :loading="loading" :disabled="busy">
      {{ t('login.submit') }}
    </n-button>
  </n-form>
</template>
