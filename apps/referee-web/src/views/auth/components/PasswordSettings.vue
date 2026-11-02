<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { NButton, NInput } from 'naive-ui'
import { useAuthStore } from '../../../stores/auth'
import { useAccount } from '../useAccount'
const auth = useAuthStore()
const { fields, errors, success, challenge, busy, isInitialPassword, sendCode, savePassword } = useAccount(auth)
const { remaining, sending, notice, error: sendError, expired } = challenge
const summary = ref<HTMLElement | null>(null)
async function submit() {
  if (!await savePassword()) { await nextTick(); summary.value?.focus() }
}
</script>

<template>
  <section class="mt-6 border-0 border-t border-solid border-line pt-6" aria-labelledby="password-heading">
    <h3 class="mt-0 mr-0 mb-2 ml-0 text-[18px]" id="password-heading">{{ isInitialPassword ? '设置登录密码' : '更换登录密码' }}</h3>
    <p class="mt-0 mr-0 mb-5 ml-0 text-[13px] leading-[1.8] text-body">{{ isInitialPassword ? '邮箱已验证，无需再次获取验证码。设置密码即可完成注册，以后也可使用邮箱和密码登录。' : '先验证当前邮箱。更新密码后，其他旧登录会话将失效。' }}</p>
    <form novalidate :aria-busy="busy" @submit.prevent="submit">
      <div v-if="Object.keys(errors).length || auth.error" ref="summary" class="mb-5 rounded-xl border border-solid border-red bg-soft px-4 py-3 text-[13px] leading-[1.7] text-red-hover" role="alert" tabindex="-1">
        {{ auth.error || '请检查以下输入后再试。' }}
        <ul class="mt-2 mr-0 mb-0 ml-0 pl-5"><li v-for="(message, field) in errors" :key="field"><a class="inline-block px-0 py-1" :href="`#settings-${field}`">{{ message }}</a></li></ul>
      </div>
      <div v-if="!isInitialPassword" class="mb-5 min-w-0">
        <label class="mb-2 block text-[14px] font-semibold" for="settings-code">邮箱验证码</label>
        <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
          <n-input v-model:value="fields.code" placeholder="6 位数字" :maxlength="6" :disabled="busy"
            v-bind="errors.code ? { status: 'error' as const } : {}"
            :input-props="{ id: 'settings-code', inputmode: 'numeric', autocomplete: 'one-time-code', 'aria-invalid': !!errors.code, 'aria-describedby': 'settings-code-hint' }" />
          <n-button secondary :loading="sending" :disabled="busy || remaining > 0" @click="sendCode">{{ remaining ? `${remaining} 秒后重发` : '获取验证码' }}</n-button>
        </div>
        <p id="settings-code-hint" :class="errors.code ? 'mt-2 mr-0 mb-0 ml-0 text-[12px] leading-[1.7] wrap-anywhere text-red-hover' : 'mt-2 mr-0 mb-0 ml-0 text-[12px] leading-[1.7] wrap-anywhere text-body'">{{ errors.code || `验证码将发送至 ${auth.user?.email ?? ''}` }}</p>
      </div>
      <div class="mb-5 min-w-0">
        <label class="mb-2 block text-[14px] font-semibold" for="settings-password">新密码</label>
        <n-input v-model:value="fields.password" type="password" placeholder="设置新的登录密码" :maxlength="128" :disabled="busy"
          v-bind="errors.password ? { status: 'error' as const } : {}"
          :input-props="{ id: 'settings-password', autocomplete: 'new-password', 'aria-invalid': !!errors.password, 'aria-describedby': 'settings-password-hint' }" />
        <p id="settings-password-hint" :class="errors.password ? 'mt-2 mr-0 mb-0 ml-0 text-[12px] leading-[1.7] wrap-anywhere text-red-hover' : 'mt-2 mr-0 mb-0 ml-0 text-[12px] leading-[1.7] wrap-anywhere text-body'">{{ errors.password || '建议使用至少 12 个字符的长密码，最终要求以平台安全策略为准。' }}</p>
      </div>
      <div class="mb-5 min-w-0">
        <label class="mb-2 block text-[14px] font-semibold" for="settings-confirmation">再次输入新密码</label>
        <n-input v-model:value="fields.confirmation" type="password" placeholder="确认新密码" :maxlength="128" :disabled="busy"
          v-bind="errors.confirmation ? { status: 'error' as const } : {}"
          :input-props="{ id: 'settings-confirmation', autocomplete: 'new-password', 'aria-invalid': !!errors.confirmation, 'aria-describedby': errors.confirmation ? 'settings-confirmation-error' : undefined }" />
        <p v-if="errors.confirmation" id="settings-confirmation-error" class="mt-2 mr-0 mb-0 ml-0 text-[12px] leading-[1.7] wrap-anywhere text-red-hover">{{ errors.confirmation }}</p>
      </div>
      <p v-if="sendError" class="mt-2 mr-0 mb-0 ml-0 text-[12px] leading-[1.7] wrap-anywhere text-red-hover" role="alert">{{ sendError }}</p>
      <p v-else-if="expired" class="mt-2 mr-0 mb-0 ml-0 text-[12px] leading-[1.7] wrap-anywhere text-red-hover" role="status">验证码已过期，请重新获取。</p>
      <p v-else-if="notice" class="mt-0 mr-0 mb-5 ml-0 text-[13px] leading-[1.7] text-body" role="status">{{ notice }}</p>
      <p v-if="success" class="mt-0 mr-0 mb-5 ml-0 text-[13px] leading-[1.7] text-body" role="status">{{ success }}</p>
      <n-button type="primary" attr-type="submit" block :loading="auth.busy" :disabled="busy">{{ isInitialPassword ? '设置密码并完成注册' : '保存新密码' }}</n-button>
    </form>
  </section>
</template>
