<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { NButton, NModal } from 'naive-ui'
import { useRoute } from 'vue-router'
import { useSessionStore } from '../../stores/session'
import { adminModalStyle } from '../../ui-theme'
import AdminNavigation from './AdminNavigation.vue'

const session = useSessionStore()
const route = useRoute()
const menuOpen = ref(false)
const main = ref<HTMLElement>()
let navigated = false
let menuClosing = false
function closeMenu() { menuClosing = true; menuOpen.value = false }
watch(() => route.path, async () => {
  if (menuOpen.value || menuClosing) { navigated = true; closeMenu() }
  else { await nextTick(); main.value?.focus() }
})
async function afterMenuClose() {
  const focusMain = navigated
  navigated = false
  menuClosing = false
  // 等待 Modal 恢复触发器焦点后再定位新页面；普通关闭仍保留组件库的焦点恢复。
  await nextTick()
  if (focusMain) main.value?.focus()
  else document.getElementById('admin-menu-trigger')?.focus()
}
</script>

<template>
  <a href="#admin-main" class="fixed left-4 top-4 z-50 -translate-y-32 rounded-full bg-ink px-5 py-3 text-surface focus:translate-y-0">跳至主内容</a>
  <div class="min-h-screen lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
    <aside class="hidden min-h-screen border-0 border-r border-solid border-line bg-sand p-5 lg:block">
      <div class="sticky top-6">
        <a href="/admin/" class="mb-10 flex min-h-[44px] items-center gap-3 text-lg font-bold no-underline">
          <span class="grid h-11 w-11 place-items-center rounded-2xl bg-ink text-sm text-surface" aria-hidden="true">裁</span>
          裁判工具平台
        </a>
        <AdminNavigation />
        <p class="mt-10 px-4 text-xs leading-relaxed text-body">平台管理工作区<br />业务操作以实时授权为准</p>
        <a href="/" class="mt-4 flex min-h-[44px] items-center px-4 text-sm text-body hover:text-red">返回裁判端</a>
      </div>
    </aside>
    <div class="min-w-0">
      <header class="flex flex-wrap items-center justify-between gap-3 border-0 border-b border-solid border-line bg-surface px-4 py-4 md:px-8">
        <div class="flex min-w-0 items-center gap-3">
          <div class="lg:hidden"><NButton id="admin-menu-trigger" aria-label="打开管理菜单" aria-haspopup="dialog" :aria-expanded="menuOpen" @click="menuOpen = true">菜单</NButton></div>
          <p class="m-0 text-sm text-body">平台管理 <span aria-hidden="true" class="mx-2">/</span><span class="font-semibold text-ink">{{ route.meta.title }}</span></p>
        </div>
        <div class="flex min-w-0 items-center gap-3">
          <span class="max-w-44 truncate text-sm text-body">{{ session.user?.displayName }}</span>
          <NButton :loading="session.busy" :disabled="session.busy" @click="session.logout">退出登录</NButton>
        </div>
      </header>
      <div v-if="session.error" role="alert" class="mx-4 mt-4 rounded-xl border border-solid border-red bg-soft p-4 text-red-hover md:mx-8">{{ session.error }}</div>
      <main id="admin-main" ref="main" tabindex="-1" class="mx-auto max-w-7xl p-4 md:p-8"><slot /></main>
      <footer class="px-4 pb-6 text-xs text-body md:px-8">篮球裁判综合工具平台 · 管理端</footer>
    </div>
  </div>
  <NModal v-model:show="menuOpen" preset="card" title="管理端导航" aria-label="管理端导航" :style="adminModalStyle"
    class="max-h-[85dvh] max-w-sm overflow-y-auto" :on-after-leave="afterMenuClose">
    <AdminNavigation @navigate="closeMenu" />
    <div class="mt-5"><NButton @click="closeMenu">关闭菜单</NButton></div>
  </NModal>
</template>
