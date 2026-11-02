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
const summary = ref<HTMLElement | null>(null)
watch(() => props.initialMode, (value) => { mode.value = value === 'register' ? 'register' : 'code' })
watch(status, (value) => { if (value === 'authenticated') void router.replace('/account') })
onMounted(() => { void auth.restore() })
async function onSubmit() {
  if (await submit()) await router.replace('/account')
  else { await nextTick(); summary.value?.focus() }
}
</script>

<template>
  <AuthShell>
    <div class="auth-panel">
      <template v-if="status === 'unknown' || status === 'loading'">
        <p role="status">正在确认登录状态…</p>
      </template>
      <template v-else-if="status === 'error'">
        <h2>暂时无法确认登录状态</h2>
        <n-alert type="error" :show-icon="false">{{ error }}</n-alert>
        <n-button type="primary" block @click="auth.restore(true)">重试连接</n-button>
      </template>
      <template v-else>
        <header class="auth-panel-heading">
          <p class="auth-eyebrow">{{ mode === 'register' ? '创建账号' : '欢迎回来' }}</p>
          <h2>{{ mode === 'register' ? '开启你的裁判之旅' : '登录裁判工具箱' }}</h2>
          <p>{{ mode === 'register' ? '验证邮箱，建立属于你的个人账号。' : '登录后，继续你的学习与裁判履职。' }}</p>
        </header>
        <div v-if="mode !== 'register'" class="auth-methods" role="group" aria-label="选择登录方式">
          <n-button :type="mode === 'code' ? 'primary' : 'default'" :bordered="false" :aria-pressed="mode === 'code'" :disabled="busy" @click="mode = 'code'">验证码登录</n-button>
          <n-button :type="mode === 'password' ? 'primary' : 'default'" :bordered="false" :aria-pressed="mode === 'password'" :disabled="busy" @click="mode = 'password'">密码登录</n-button>
        </div>
        <form novalidate :aria-busy="busy" @submit.prevent="onSubmit">
          <div v-if="Object.keys(errors).length || error" ref="summary" class="auth-error-summary" role="alert" tabindex="-1">
            {{ error || '请检查以下输入后再试。' }}
            <ul v-if="Object.keys(errors).length">
              <li v-for="(message, field) in errors" :key="field"><a :href="`#auth-${field === 'displayName' ? 'name' : field}`">{{ message }}</a></li>
            </ul>
          </div>
          <AuthFields v-model:fields="fields" :mode="mode" :errors="errors" :busy="busy" :sending="sending" :remaining="remaining" @send="sendCode" />
          <p v-if="challengeError" class="auth-field-error" role="alert">{{ challengeError }}</p>
          <p v-else-if="expired && mode !== 'password'" class="auth-field-error" role="status">验证码已过期，请重新获取。</p>
          <p v-else-if="notice && mode !== 'password'" class="auth-send-notice" role="status">{{ notice }}</p>
          <n-button class="auth-submit" type="primary" attr-type="submit" size="large" block :loading="auth.busy" :disabled="busy">{{ mode === 'register' ? '验证邮箱并注册' : '登录' }}</n-button>
        </form>
        <p v-if="mode === 'register'" class="auth-field-hint">注册后可在账号页设置密码，也可以始终使用验证码登录。</p>
        <p class="auth-switch">{{ mode === 'register' ? '已有账号？' : '还没有账号？' }}
          <RouterLink :to="mode === 'register' ? '/login' : '/register'">{{ mode === 'register' ? '去登录' : '创建账号' }}</RouterLink>
        </p>
      </template>
    </div>
  </AuthShell>
</template>
