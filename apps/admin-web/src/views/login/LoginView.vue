<script setup lang="ts">
import { nextTick } from 'vue'
import { NButton, NInput } from 'naive-ui'
import { useSessionStore } from '../../stores/session'
import { useLogin } from './useLogin'

const session = useSessionStore()
const { email, password, errors, focusTarget, submit } = useLogin(session.login)
async function onSubmit() {
  await submit()
  await nextTick()
  if (focusTarget.value) document.getElementById(focusTarget.value)?.focus()
}
</script>

<template>
  <main class="grid min-h-screen lg:grid-cols-2">
    <section class="flex flex-col justify-between bg-sand p-6 md:p-12">
      <a href="/" class="flex min-h-[44px] items-center gap-3 text-lg font-bold no-underline">
        <span class="grid h-11 w-11 place-items-center rounded-2xl bg-ink text-sm text-surface" aria-hidden="true">裁</span>裁判工具平台
      </a>
      <div class="max-w-lg py-8 lg:py-16">
        <h1 class="mb-5 text-3xl font-bold tracking-tight md:text-5xl">让每一次审核<br class="hidden lg:block" />有据可循。</h1>
        <p class="text-base leading-relaxed text-body">组织、资质、学习与考试的统一管理工作区。用清晰的流程处理业务，用完整的审计保留依据。</p>
      </div>
      <p class="mb-0 text-sm text-body">仅限授权人员处理受保护的业务记录</p>
    </section>
    <section class="flex items-center justify-center p-6 md:p-12">
      <div class="w-full max-w-sm">
        <h2 class="mb-2 text-2xl font-bold">管理端登录</h2>
        <p class="mb-8 mt-0 text-sm leading-relaxed text-body">使用平台账号登录。登录成功不代表获得管理权限，业务操作将独立核验授权。</p>
        <form novalidate class="grid gap-5" @submit.prevent="onSubmit">
          <div>
            <label for="login-email" class="mb-2 block text-sm font-semibold">邮箱</label>
            <NInput v-model:value="email" placeholder="请输入邮箱" :disabled="session.busy"
              :input-props="{ id: 'login-email', type: 'email', autocomplete: 'username', 'aria-invalid': !!errors.email, 'aria-describedby': errors.email ? 'email-error' : undefined }" />
            <p v-if="errors.email" id="email-error" class="mb-0 mt-2 text-sm text-red-hover">{{ errors.email }}</p>
          </div>
          <div>
            <label for="login-password" class="mb-2 block text-sm font-semibold">密码</label>
            <NInput v-model:value="password" type="password" placeholder="请输入密码" :disabled="session.busy"
              :input-props="{ id: 'login-password', autocomplete: 'current-password', 'aria-invalid': !!errors.password, 'aria-describedby': errors.password ? 'password-error' : undefined }" />
            <p v-if="errors.password" id="password-error" class="mb-0 mt-2 text-sm text-red-hover">{{ errors.password }}</p>
          </div>
          <p v-if="session.error" id="login-error" role="alert" tabindex="-1" class="m-0 rounded-xl bg-soft p-4 text-sm text-red-hover">{{ session.error }}</p>
          <NButton attr-type="submit" type="primary" :loading="session.busy" :disabled="session.busy">登录管理端</NButton>
        </form>
        <p class="mt-6 text-sm leading-relaxed text-body">尚未设置密码？请先在裁判端使用邮箱验证码登录，设置密码后返回管理端。</p>
        <a href="/login" class="inline-flex min-h-[44px] items-center text-sm font-semibold hover:text-red">前往裁判端登录</a>
      </div>
    </section>
  </main>
</template>
