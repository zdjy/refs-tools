<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { NAlert, NButton, NPopconfirm } from 'naive-ui'
import { useAuthStore } from '../../stores/auth'
import AuthShell from './components/AuthShell.vue'
import PasswordSettings from './components/PasswordSettings.vue'
import './auth.css'
const auth = useAuthStore()
const { user, session, status, error, busy } = storeToRefs(auth)
onMounted(() => { void auth.restore() })
</script>

<template>
  <AuthShell account>
    <div class="mx-auto max-w-[480px] rounded-3xl border border-solid border-line bg-surface px-5 py-6 shadow-card xs:px-6 xs:py-7 sm:px-8 sm:py-9 md:w-full lg:p-10">
      <p v-if="status === 'unknown' || status === 'loading'" role="status">正在确认登录状态…</p>
      <template v-else-if="status === 'error'">
        <h2 class="mt-0 mr-0 mb-3 ml-0 text-[24px] leading-[1.4] tracking-[-.025em] wrap-anywhere">暂时无法确认登录状态</h2>
        <n-alert type="error" :show-icon="false">{{ error }}</n-alert>
        <n-button type="primary" block @click="auth.restore(true)">重试连接</n-button>
      </template>
      <template v-else-if="user && session">
        <header class="mb-7">
          <p class="mt-0 mr-0 mb-3 ml-0 text-[12px] font-bold tracking-[.06em] text-red">个人账号</p>
          <h2 class="mt-0 mr-0 mb-3 ml-0 text-[24px] leading-[1.4] tracking-[-.025em] wrap-anywhere">{{ user.displayName }}，你好</h2>
          <p class="m-0 text-[14px] leading-[1.7] text-body">管理你的登录方式与账号安全。</p>
        </header>
        <dl class="m-0">
          <div class="mt-4"><dt class="mb-1.5 text-[12px] text-body">邮箱地址</dt><dd class="m-0 text-[14px] wrap-anywhere">{{ user.email }}</dd></div>
          <div class="mt-4"><dt class="mb-1.5 text-[12px] text-body">邮箱状态</dt><dd class="m-0 text-[14px] wrap-anywhere"><span class="inline-flex rounded-full border border-solid border-line bg-soft px-3 py-1 text-[12px]">{{ user.emailVerified ? '已验证' : '待验证' }}</span></dd></div>
          <div class="mt-4"><dt class="mb-1.5 text-[12px] text-body">本次登录有效至</dt><dd class="m-0 text-[14px] wrap-anywhere">{{ new Date(session.expiresAt).toLocaleString('zh-CN') }}</dd></div>
        </dl>
        <n-alert v-if="!user.emailVerified" type="info" :show-icon="false">邮箱尚未验证。请使用邮箱验证码重新登录，完成验证后才能进行考试、认证等核心操作。</n-alert>
        <PasswordSettings />
        <section class="mt-6 border-0 border-t border-solid border-line pt-6" aria-labelledby="session-heading">
          <h3 class="mt-0 mr-0 mb-2 ml-0 text-[18px]" id="session-heading">当前登录</h3>
          <p class="mt-0 mr-0 mb-5 ml-0 text-[13px] leading-[1.8] text-body">共享设备使用完毕后，请退出账号。本地比赛记录仍保存在此设备。</p>
          <n-popconfirm positive-text="退出登录" negative-text="取消" :disabled="busy" @positive-click="auth.logout">
            <template #trigger><n-button secondary block :loading="busy" :disabled="busy">退出登录</n-button></template>
            确认结束当前账号的登录会话？
          </n-popconfirm>
        </section>
      </template>
      <template v-else>
        <p class="mt-0 mr-0 mb-3 ml-0 text-[12px] font-bold tracking-[.06em] text-red">账号与安全</p>
        <h2 class="mt-0 mr-0 mb-3 ml-0 text-[24px] leading-[1.4] tracking-[-.025em] wrap-anywhere">当前尚未登录</h2>
        <p class="mt-0 mr-0 mb-5 ml-0 text-[13px] leading-[1.8] text-body">登录后可管理邮箱与密码，继续你的裁判履职。</p>
        <RouterLink class="flex min-h-12 items-center justify-center rounded-full bg-ink text-[14px] font-semibold text-surface no-underline transition-[background,transform] duration-300 ease-[cubic-bezier(.25,.1,.25,1)] hover:bg-black active:scale-[.98]" to="/login">前往登录</RouterLink>
        <RouterLink class="mt-3 flex min-h-12 items-center justify-center rounded-full bg-soft text-[14px] font-semibold no-underline transition-[background,transform] duration-300 ease-[cubic-bezier(.25,.1,.25,1)] hover:bg-line active:scale-[.98]" to="/register">创建账号</RouterLink>
      </template>
    </div>
  </AuthShell>
</template>
