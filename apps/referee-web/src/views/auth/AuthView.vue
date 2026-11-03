<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { NAlert, NButton } from 'naive-ui'
import { useAuthStore } from '../../stores/auth'
import { useAuth } from './useAuth'
import AuthShell from './components/AuthShell.vue'
import AuthFields from './components/AuthFields.vue'
import './auth.css'

const props = defineProps<{ initialMode: 'login' | 'register' }>()
const router = useRouter()
const auth = useAuthStore()
const { status, error } = storeToRefs(auth)
const { mode, fields, errors, challenge, busy, sendCode, submit } = useAuth(auth, props.initialMode)
const { sending, remaining, notice, error: challengeError, expired } = challenge
const form = ref<HTMLFormElement | null>(null)
const summary = ref<HTMLElement | null>(null)
watch(() => props.initialMode, (value) => { mode.value = value === 'register' ? 'register' : 'code' })
watch(status, (value) => { if (value === 'authenticated') void router.replace('/account') })
onMounted(() => { void auth.restore() })
async function onSubmit() {
  if (await submit()) await router.replace('/account')
  else {
    await nextTick()
    const invalidInput = form.value?.querySelector<HTMLElement>('input[aria-invalid="true"]')
    if (invalidInput) invalidInput.focus()
    else summary.value?.focus()
  }
}
</script>

<template>
  <AuthShell>
    <div class="mx-auto max-w-[480px] rounded-2xl border border-solid border-line bg-surface px-5 py-6 shadow-raised xs:px-6 xs:py-7 sm:px-8 sm:py-9 md:w-full lg:p-10">
      <template v-if="status === 'unknown' || status === 'loading'">
        <p role="status">正在确认登录状态…</p>
      </template>
      <template v-else-if="status === 'error'">
        <h2 class="mt-0 mr-0 mb-3 ml-0 text-[24px] leading-[1.4] tracking-[-.025em] wrap-anywhere">暂时无法确认登录状态</h2>
        <n-alert type="error" :show-icon="false">{{ error }}</n-alert>
        <n-button type="primary" block @click="auth.restore(true)">重试连接</n-button>
      </template>
      <template v-else>
        <header class="mb-7">
          <p class="mt-0 mr-0 mb-3 ml-0 text-xs font-bold tracking-wider text-red-hover uppercase">{{ mode === 'register' ? '创建账号' : '欢迎回来' }}</p>
          <h2 class="mt-0 mr-0 mb-3 ml-0 text-[24px] leading-[1.4] tracking-[-.025em] wrap-anywhere">{{ mode === 'register' ? '开启你的裁判之旅' : '登录裁判工具箱' }}</h2>
          <p class="m-0 text-[14px] leading-[1.7] text-body">{{ mode === 'register' ? '验证邮箱，建立属于你的个人账号。' : '登录后，继续你的学习与裁判履职。' }}</p>
        </header>
        <div v-if="mode !== 'register'" class="mb-6 grid grid-cols-2 gap-2 rounded-full bg-soft p-1" role="group" aria-label="选择登录方式">
          <n-button :type="mode === 'code' ? 'primary' : 'default'" :bordered="false" :aria-pressed="mode === 'code'" :disabled="busy" @click="mode = 'code'">验证码登录</n-button>
          <n-button :type="mode === 'password' ? 'primary' : 'default'" :bordered="false" :aria-pressed="mode === 'password'" :disabled="busy" @click="mode = 'password'">密码登录</n-button>
        </div>
        <form ref="form" novalidate :aria-busy="busy" @submit.prevent="onSubmit">
          <div v-if="error" ref="summary" class="mb-5 rounded-xl border border-solid border-red bg-soft px-4 py-3 text-[13px] leading-[1.7] text-red-hover" role="alert" tabindex="-1">
            {{ error }}
          </div>
          <AuthFields v-model:fields="fields" :mode="mode" :errors="errors" :busy="busy" :sending="sending" :remaining="remaining" @send="sendCode" />
          <p v-if="challengeError" class="mt-2 mr-0 mb-0 ml-0 text-[12px] leading-[1.7] wrap-anywhere text-red-hover" role="alert">{{ challengeError }}</p>
          <p v-else-if="expired && mode !== 'password'" class="mt-2 mr-0 mb-0 ml-0 text-[12px] leading-[1.7] wrap-anywhere text-red-hover" role="status">验证码已过期，请重新获取。</p>
          <p v-else-if="notice && mode !== 'password'" class="mt-0 mr-0 mb-5 ml-0 text-[13px] leading-[1.7] text-body" role="status">{{ notice }}</p>
          <div class="mt-1"><n-button type="primary" attr-type="submit" size="large" block :loading="auth.busy" :disabled="busy">{{ mode === 'register' ? '验证邮箱并注册' : '登录' }}</n-button></div>
        </form>
        <p v-if="mode === 'register'" class="mt-2 mr-0 mb-0 ml-0 text-[12px] leading-[1.7] wrap-anywhere text-body">注册后可在账号页设置密码，也可以始终使用验证码登录。</p>
        <p class="mt-6 mr-0 mb-0 ml-0 flex flex-wrap items-center justify-center gap-1 border-0 border-t border-solid border-line pt-5 text-[14px] text-body">{{ mode === 'register' ? '已有账号？' : '还没有账号？' }}
          <RouterLink class="inline-flex min-h-11 items-center px-2 py-0 font-semibold text-ink underline-offset-4 hover:text-red" :to="mode === 'register' ? '/login' : '/register'">{{ mode === 'register' ? '去登录' : '创建账号' }}</RouterLink>
        </p>
      </template>
    </div>
  </AuthShell>
</template>
