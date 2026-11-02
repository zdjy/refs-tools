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
    <div class="auth-panel auth-account-panel">
      <p v-if="status === 'unknown' || status === 'loading'" role="status">正在确认登录状态…</p>
      <template v-else-if="status === 'error'">
        <h2>暂时无法确认登录状态</h2>
        <n-alert type="error" :show-icon="false">{{ error }}</n-alert>
        <n-button type="primary" block @click="auth.restore(true)">重试连接</n-button>
      </template>
      <template v-else-if="user && session">
        <header class="auth-panel-heading">
          <p class="auth-eyebrow">个人账号</p>
          <h2>{{ user.displayName }}，你好</h2>
          <p>管理你的登录方式与账号安全。</p>
        </header>
        <dl class="auth-account-details">
          <div><dt>邮箱地址</dt><dd>{{ user.email }}</dd></div>
          <div><dt>邮箱状态</dt><dd><span class="auth-verification">{{ user.emailVerified ? '已验证' : '待验证' }}</span></dd></div>
          <div><dt>本次登录有效至</dt><dd>{{ new Date(session.expiresAt).toLocaleString('zh-CN') }}</dd></div>
        </dl>
        <n-alert v-if="!user.emailVerified" type="info" :show-icon="false">邮箱尚未验证。请使用邮箱验证码重新登录，完成验证后才能进行考试、认证等核心操作。</n-alert>
        <PasswordSettings />
        <section class="auth-session-section" aria-labelledby="session-heading">
          <h3 id="session-heading">当前登录</h3>
          <p class="auth-section-description">共享设备使用完毕后，请退出账号。本地比赛记录仍保存在此设备。</p>
          <n-popconfirm positive-text="退出登录" negative-text="取消" :disabled="busy" @positive-click="auth.logout">
            <template #trigger><n-button secondary block :loading="busy" :disabled="busy">退出登录</n-button></template>
            确认结束当前账号的登录会话？
          </n-popconfirm>
        </section>
      </template>
      <template v-else>
        <p class="auth-eyebrow">账号与安全</p>
        <h2>当前尚未登录</h2>
        <p class="auth-section-description">登录后可管理邮箱与密码，继续你的裁判履职。</p>
        <RouterLink class="auth-primary-link" to="/login">前往登录</RouterLink>
        <RouterLink class="auth-secondary-link" to="/register">创建账号</RouterLink>
      </template>
    </div>
  </AuthShell>
</template>
