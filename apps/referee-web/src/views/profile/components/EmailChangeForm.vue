<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { NAlert, NButton, NInput } from 'naive-ui'
import { useAuthStore } from '../../../stores/auth'
import { useEmailChange } from '../../../features/account/useEmailChange'

const auth = useAuthStore()
const { fields, errors, success, busy, requiresPassword, oldChallenge, newChallenge, sendOld, sendNew, submit } = useEmailChange(auth)
const form = ref<HTMLFormElement | null>(null)
const summary = ref<HTMLElement | null>(null)
const hint = (key: string, fallback: string) => errors.value[key] || fallback
const invalid = (key: string) => !!errors.value[key]

async function save() {
  if (await submit()) return
  await nextTick()
  const target = form.value?.querySelector<HTMLElement>('[aria-invalid="true"]')
  ;(target ?? summary.value)?.focus()
}
</script>

<template>
  <section class="grid gap-4" aria-labelledby="profile-email-heading">
    <header class="grid gap-1">
      <h2 id="profile-email-heading" class="m-0 text-[16px]">登录邮箱</h2>
      <p class="m-0 text-[13px] leading-[1.8] text-body">当前邮箱：<span class="wrap-anywhere">{{ auth.user?.email }}</span>（{{ auth.user?.emailVerified ? '已验证' : '待验证' }}）</p>
    </header>
    <form ref="form" novalidate class="grid gap-4" :aria-busy="busy" @submit.prevent="save">
      <div v-if="auth.error" ref="summary" tabindex="-1" role="alert" class="rounded-xl border border-solid border-red bg-soft px-4 py-3 text-[13px] leading-[1.7] text-red-hover">{{ auth.error }}</div>
      <div class="grid gap-2">
        <label class="text-[14px] font-semibold" for="email-old-code">1. 当前邮箱验证码</label>
        <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
          <n-input id="email-old-code" v-model:value="fields.oldCode" placeholder="6 位数字" :maxlength="6" :disabled="busy"
            v-bind="invalid('oldCode') ? { status: 'error' as const } : {}"
            :input-props="{ inputmode: 'numeric', autocomplete: 'one-time-code', 'aria-invalid': invalid('oldCode'), 'aria-describedby': 'email-old-code-hint' }" />
          <n-button secondary :loading="oldChallenge.sending.value" :disabled="busy || oldChallenge.remaining.value > 0" @click="sendOld">
            {{ oldChallenge.remaining.value ? `${oldChallenge.remaining.value} 秒后重发` : '获取验证码' }}
          </n-button>
        </div>
        <p id="email-old-code-hint" class="m-0 text-[12px] leading-[1.7]" :class="invalid('oldCode') ? 'text-red-hover' : 'text-body'">
          {{ hint('oldCode', oldChallenge.error.value || oldChallenge.notice.value || '验证码将发送到当前邮箱。') }}
        </p>
      </div>
      <div v-if="requiresPassword" class="grid gap-2">
        <label class="text-[14px] font-semibold" for="email-password">2. 当前登录密码</label>
        <n-input id="email-password" v-model:value="fields.password" type="password" placeholder="输入当前密码" :maxlength="128" :disabled="busy"
          v-bind="invalid('password') ? { status: 'error' as const } : {}"
          :input-props="{ autocomplete: 'current-password', 'aria-invalid': invalid('password'), 'aria-describedby': 'email-password-hint' }" />
        <p id="email-password-hint" class="m-0 text-[12px] leading-[1.7]" :class="invalid('password') ? 'text-red-hover' : 'text-body'">
          {{ hint('password', '无密码账号不显示此步骤。') }}
        </p>
      </div>
      <div class="grid gap-2">
        <label class="text-[14px] font-semibold" for="email-new">3. 新邮箱与验证码</label>
        <n-input id="email-new" v-model:value="fields.newEmail" placeholder="new@example.com" :maxlength="254" :disabled="busy"
          v-bind="invalid('newEmail') ? { status: 'error' as const } : {}"
          :input-props="{ autocomplete: 'email', inputmode: 'email', 'aria-invalid': invalid('newEmail'), 'aria-describedby': 'email-new-hint' }" />
        <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
          <n-input v-model:value="fields.newCode" placeholder="新邮箱收到的 6 位验证码" :maxlength="6" :disabled="busy"
            v-bind="invalid('newCode') ? { status: 'error' as const } : {}"
            :input-props="{ inputmode: 'numeric', autocomplete: 'one-time-code', 'aria-label': '新邮箱验证码', 'aria-invalid': invalid('newCode'), 'aria-describedby': 'email-new-hint' }" />
          <n-button secondary :loading="newChallenge.sending.value" :disabled="busy || newChallenge.remaining.value > 0" @click="sendNew">
            {{ newChallenge.remaining.value ? `${newChallenge.remaining.value} 秒后重发` : '发送到新邮箱' }}
          </n-button>
        </div>
        <p id="email-new-hint" class="m-0 text-[12px] leading-[1.7]" :class="invalid('newEmail') || invalid('newCode') ? 'text-red-hover' : 'text-body'">
          {{ hint('newEmail', '') || hint('newCode', newChallenge.error.value || newChallenge.notice.value || '新邮箱将成为唯一登录邮箱。切换后其他设备的会话会立即失效。') }}
        </p>
      </div>
      <p v-if="success" role="status" class="m-0 text-[13px] leading-[1.7] text-body">{{ success }}</p>
      <div><n-button type="primary" attr-type="submit" :loading="auth.busy" :disabled="busy">更换登录邮箱</n-button></div>
    </form>
    <n-alert v-if="!auth.user?.emailVerified" type="info" :show-icon="false">
      当前邮箱尚未验证。更换邮箱后会自动标记为已验证，可继续进行考试与认证等核心操作。
    </n-alert>
  </section>
</template>
