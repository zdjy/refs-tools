<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { NAlert, NButton } from 'naive-ui'
import { useAuthStore } from '../../stores/auth'
import { useAuth } from './useAuth'
import AuthShell from './components/AuthShell.vue'
import AuthFields from './components/AuthFields.vue'
import UiLoadingRegion from '../../components/ui/UiLoadingRegion.vue'

const props = defineProps<{ initialMode: 'login' | 'register' }>()
const router = useRouter()
const auth = useAuthStore()
const { status, error } = storeToRefs(auth)
const { mode, fields, errors, challenge, busy, sendCode, submit } = useAuth(auth, props.initialMode)
const { sending, remaining, notice, error: challengeError, expired } = challenge
const form = ref<HTMLFormElement | null>(null)
const summary = ref<HTMLElement | null>(null)
watch(() => props.initialMode, (value) => { mode.value = value === 'register' ? 'register' : 'code' })
// 登录后直接进入社区（根路径）；注册后仍进账号页完成首次密码设置，见 FS-0022 与 ADR 0012。
const landing = () => mode.value === 'register' ? '/account' : '/'
watch(status, (value) => { if (value === 'authenticated') void router.replace(landing()) })
onMounted(() => { void auth.restore() })
async function onSubmit() {
  if (await submit()) await router.replace(landing())
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
    <div class="rounded-xl border border-solid border-line bg-surface px-5 py-6 xs:px-6 xs:py-7 sm:px-8 sm:py-8">
      <template v-if="status === 'unknown' || status === 'loading'">
        <UiLoadingRegion :loading="true" label="确认登录状态" :lines="2" @retry="auth.restore(true)" />
      </template>
      <template v-else-if="status === 'error'">
        <h2 class="text-ink mt-0 mr-0 mb-3 ml-0 text-[24px] leading-[1.4] tracking-[-.025em] wrap-anywhere">暂时无法确认登录状态</h2>
        <n-alert type="error" :show-icon="false">{{ error }}</n-alert>
        <n-button type="primary" block @click="auth.restore(true)">重试连接</n-button>
      </template>
      <template v-else>
        <header class="mb-7">
          <h2 class="text-ink mt-0 mr-0 mb-3 ml-0 text-[24px] leading-[1.4] tracking-[-.025em] wrap-anywhere">{{ mode === 'register' ? '创建裁判账号' : '登录裁判工具箱' }}</h2>
          <p class="m-0 text-[14px] leading-[1.7] text-body">{{ mode === 'register' ? '验证邮箱，建立属于你的个人账号。' : '使用邮箱验证码或密码登录。' }}</p>
        </header>
        <div v-if="mode !== 'register'" class="relative mb-6 grid grid-cols-2 rounded-full bg-soft p-0.5" role="group" aria-label="选择登录方式">
          <!-- 滑块在两个选项间用弹性曲线滑动；按钮自身只改文字样式，避免两层背景叠加。 -->
          <span aria-hidden="true" class="absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-full bg-surface shadow-selected transition-transform duration-[380ms] ease-(--ease-spring)" :class="mode === 'password' ? 'translate-x-full' : ''"></span>
          <button type="button" :aria-pressed="mode === 'code'" :disabled="busy" class="relative min-h-11 cursor-pointer rounded-full border-0 bg-transparent px-3 text-[15px] transition-colors duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-60" :class="mode === 'code' ? 'font-semibold text-ink' : 'font-medium text-body hover:text-ink'" @click="mode = 'code'">验证码登录</button>
          <button type="button" :aria-pressed="mode === 'password'" :disabled="busy" class="relative min-h-11 cursor-pointer rounded-full border-0 bg-transparent px-3 text-[15px] transition-colors duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-60" :class="mode === 'password' ? 'font-semibold text-ink' : 'font-medium text-body hover:text-ink'" @click="mode = 'password'">密码登录</button>
        </div>
        <form ref="form" novalidate :aria-busy="busy" @submit.prevent="onSubmit">
          <div v-if="error" ref="summary" class="mb-5 rounded-xl border border-solid border-danger bg-soft px-4 py-3 text-[13px] leading-[1.7] text-danger" role="alert" tabindex="-1">
            {{ error }}
          </div>
          <AuthFields v-model:fields="fields" :mode="mode" :errors="errors" :busy="busy" :sending="sending" :remaining="remaining" @send="sendCode" />
          <p v-if="challengeError" class="mt-2 mr-0 mb-0 ml-0 text-[12px] leading-[1.7] wrap-anywhere text-danger" role="alert">{{ challengeError }}</p>
          <p v-else-if="expired && mode !== 'password'" class="mt-2 mr-0 mb-0 ml-0 text-[12px] leading-[1.7] wrap-anywhere text-danger" role="status">验证码已过期，请重新获取。</p>
          <p v-else-if="notice && mode !== 'password'" class="mt-0 mr-0 mb-5 ml-0 text-[13px] leading-[1.7] text-body" role="status">{{ notice }}</p>
          <div class="mt-1"><n-button type="primary" attr-type="submit" size="large" block :loading="auth.busy" :disabled="busy">{{ mode === 'register' ? '验证邮箱并注册' : '登录' }}</n-button></div>
        </form>
        <p v-if="mode === 'register'" class="mt-2 mr-0 mb-0 ml-0 text-[12px] leading-[1.7] wrap-anywhere text-body">注册后可在账号页设置密码，也可以始终使用验证码登录。</p>
        <p class="mt-6 mr-0 mb-0 ml-0 flex flex-wrap items-center justify-center gap-1 border-0 border-t border-solid border-line pt-5 text-[14px] text-body">{{ mode === 'register' ? '已有账号？' : '还没有账号？' }}
          <RouterLink class="inline-flex min-h-11 items-center px-2 py-0 font-semibold text-ink underline-offset-4 hover:text-accent-hover" :to="mode === 'register' ? '/login' : '/register'">{{ mode === 'register' ? '去登录' : '创建账号' }}</RouterLink>
        </p>
      </template>
    </div>
  </AuthShell>
</template>
