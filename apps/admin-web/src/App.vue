<script setup lang="ts">
import { defineAsyncComponent, onMounted, watch } from 'vue'
import { NButton, NConfigProvider, zhCN, dateZhCN } from 'naive-ui'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from './stores/session'
import { adminTheme } from './ui-theme'
import AdminLayout from './layout/index.vue'

const LoginView = defineAsyncComponent(() => import('./views/login/LoginView.vue'))
const session = useSessionStore()
const route = useRoute()
const router = useRouter()
onMounted(() => { void session.restore() })
watch([() => route.meta.title, () => session.status], ([title, status]) => {
  document.title = `${status === 'authenticated' ? String(title ?? '平台管理') : '管理端登录'} · 裁判工具平台`
}, { immediate: true })
watch(() => [session.status, route.path], () => {
  if (session.status === 'authenticated' && route.path === '/login') void router.replace('/')
})
</script>

<template>
  <NConfigProvider :theme-overrides="adminTheme" :locale="zhCN" :date-locale="dateZhCN">
    <div v-if="session.status === 'unknown' || session.status === 'loading'" class="grid min-h-screen place-items-center p-6" role="status">
      正在恢复管理端会话…
    </div>
    <div v-else-if="session.status === 'error'" class="mx-auto max-w-lg p-6">
      <h1 class="text-2xl">暂时无法确认登录状态</h1>
      <p role="alert" class="text-body">{{ session.error }}</p>
      <NButton type="primary" @click="session.restore">重新连接</NButton>
    </div>
    <LoginView v-else-if="session.status !== 'authenticated'" />
    <AdminLayout v-else />
  </NConfigProvider>
</template>
