<template>
  <a href="#admin-main" class="fixed left-4 top-4 z-50 -translate-y-32 rounded-full bg-ink px-5 py-3 text-surface focus:translate-y-0">跳至主内容</a>
  <NLayout class="min-h-screen" position="static" has-sider>
    <NLayoutSider
      v-if="!isMobile"
      position="static"
      :collapsed="collapsed"
      collapse-mode="width"
      :collapsed-width="64"
      :width="menuWidth"
      :native-scrollbar="false"
      content-class="min-h-screen"
    >
      <Logo :collapsed="collapsed" />
      <AsideMenu :collapsed="collapsed" />
    </NLayoutSider>

    <NDrawer
      v-model:show="showSideDrawer"
      :width="drawerWidth"
      placement="left"
      aria-label="管理端导航"
      :trap-focus="true"
      :auto-focus="true"
      :close-on-esc="true"
      :on-after-leave="afterMenuClose"
    >
      <NLayoutSider position="static" :collapsed="false" :width="drawerWidth" :native-scrollbar="false">
        <Logo :collapsed="false" />
        <AsideMenu @click-menu-item="closeMenu" />
        <div class="p-4"><NButton @click="closeMenu">关闭菜单</NButton></div>
      </NLayoutSider>
    </NDrawer>

    <NLayout class="min-w-0">
      <NLayoutHeader position="static">
        <PageHeader v-model:collapsed="collapsed" :is-mobile="isMobile" :menu-open="showSideDrawer" />
      </NLayoutHeader>
      <NLayoutContent>
        <div class="mx-auto max-w-7xl p-4 md:p-8">
          <p v-if="session.error" role="alert" class="mt-0 rounded-xl border border-solid border-red bg-soft p-4 text-red-hover">{{ session.error }}</p>
          <main id="admin-main" ref="main" tabindex="-1">
            <MainView />
          </main>
        </div>
        <footer class="px-4 pb-6 text-xs text-body md:px-8">篮球裁判综合工具平台 · 管理端</footer>
      </NLayoutContent>
    </NLayout>
  </NLayout>
</template>

<script lang="ts" setup>
import { NButton, NDrawer, NLayout, NLayoutContent, NLayoutHeader, NLayoutSider } from 'naive-ui'
import { useRoute } from 'vue-router'
import { useSessionStore } from '../stores/session'
import Logo from './components/Logo/index.vue'
import MainView from './components/Main/index.vue'
import AsideMenu from './components/Menu/index.vue'
import PageHeader from './components/Header/index.vue'
import { useLayout } from './useLayout'

const session = useSessionStore()
const route = useRoute()
const { collapsed, isMobile, menuWidth, drawerWidth, showSideDrawer, main, closeMenu, afterMenuClose } = useLayout(() => route.fullPath)
</script>
