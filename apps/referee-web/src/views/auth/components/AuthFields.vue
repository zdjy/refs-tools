<script setup lang="ts">
import { NButton, NInput } from 'naive-ui'
import type { AuthFieldErrors, AuthFields, AuthMode } from '../useAuth'
const fields = defineModel<AuthFields>('fields', { required: true })
defineProps<{ mode: AuthMode; errors: AuthFieldErrors; busy: boolean; remaining: number; sending: boolean }>()
defineEmits<{ send: [] }>()
</script>

<template>
  <div class="mb-5 min-w-0">
    <label class="mb-2 block text-[14px] font-semibold" for="auth-email">邮箱地址</label>
    <n-input v-model:value="fields.email" placeholder="name@example.com" :disabled="busy" :maxlength="254"
      v-bind="errors.email ? { status: 'error' as const } : {}"
      :input-props="{ id: 'auth-email', type: 'email', autocomplete: 'username', autocapitalize: 'none', spellcheck: false, 'aria-invalid': !!errors.email, 'aria-describedby': errors.email ? 'email-error' : undefined }" />
    <p v-if="errors.email" id="email-error" class="mt-2 mr-0 mb-0 ml-0 text-[12px] leading-[1.7] wrap-anywhere text-danger">{{ errors.email }}</p>
  </div>
  <div v-if="mode === 'register'" class="mb-5 min-w-0">
    <label class="mb-2 block text-[14px] font-semibold" for="auth-name">显示名称</label>
    <n-input v-model:value="fields.displayName" placeholder="如何称呼你" :disabled="busy" :maxlength="80"
      v-bind="errors.displayName ? { status: 'error' as const } : {}"
      :input-props="{ id: 'auth-name', autocomplete: 'nickname', 'aria-invalid': !!errors.displayName, 'aria-describedby': 'name-hint' }" />
    <p id="name-hint" :class="errors.displayName ? 'mt-2 mr-0 mb-0 ml-0 text-[12px] leading-[1.7] wrap-anywhere text-danger' : 'mt-2 mr-0 mb-0 ml-0 text-[12px] leading-[1.7] wrap-anywhere text-body'">{{ errors.displayName || '用于平台内的身份展示，最多 80 个字符。' }}</p>
  </div>
  <div v-if="mode !== 'password'" class="mb-5 min-w-0">
    <label class="mb-2 block text-[14px] font-semibold" for="auth-code">邮箱验证码</label>
    <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
      <n-input v-model:value="fields.code" placeholder="6 位数字" :disabled="busy" :maxlength="6"
        v-bind="errors.code ? { status: 'error' as const } : {}"
        :input-props="{ id: 'auth-code', inputmode: 'numeric', autocomplete: 'one-time-code', 'aria-invalid': !!errors.code, 'aria-describedby': 'code-hint' }" />
      <n-button secondary :loading="sending" :disabled="busy || remaining > 0" @click="$emit('send')">{{ remaining > 0 ? `${remaining} 秒后重发` : '获取验证码' }}</n-button>
    </div>
    <p id="code-hint" :class="errors.code ? 'mt-2 mr-0 mb-0 ml-0 text-[12px] leading-[1.7] wrap-anywhere text-danger' : 'mt-2 mr-0 mb-0 ml-0 text-[12px] leading-[1.7] wrap-anywhere text-body'">{{ errors.code || '验证码仅用于本次操作，请勿向他人透露。' }}</p>
  </div>
  <div v-else class="mb-5 min-w-0">
    <label class="mb-2 block text-[14px] font-semibold" for="auth-password">密码</label>
    <n-input v-model:value="fields.password" type="password" placeholder="输入账号密码" :disabled="busy" :maxlength="128"
      v-bind="errors.password ? { status: 'error' as const } : {}"
      :input-props="{ id: 'auth-password', autocomplete: 'current-password', 'aria-invalid': !!errors.password, 'aria-describedby': 'password-hint' }" />
    <p id="password-hint" :class="errors.password ? 'mt-2 mr-0 mb-0 ml-0 text-[12px] leading-[1.7] wrap-anywhere text-danger' : 'mt-2 mr-0 mb-0 ml-0 text-[12px] leading-[1.7] wrap-anywhere text-body'">{{ errors.password || '忘记密码？可切换验证码登录，再到账号页设置新密码。' }}</p>
  </div>
</template>
