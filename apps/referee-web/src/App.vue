<script setup lang="ts">
import { NConfigProvider, NDialogProvider, NGlobalStyle, NLoadingBarProvider, NMessageProvider, zhCN, dateZhCN } from 'naive-ui'
import { RouterView } from 'vue-router'
import UiNetworkBanner from './components/ui/UiNetworkBanner.vue'
import UiRouteProgress from './components/ui/UiRouteProgress.vue'
import { refereeTheme } from './ui-theme'
</script>

<template>
  <n-config-provider :theme-overrides="refereeTheme" :locale="zhCN" :date-locale="dateZhCN">
    <!-- 将主题同步到 body，避免组件库默认全局字体覆盖设计 token。 -->
    <n-global-style />
    <!-- 账号菜单的退出确认与失败提示按实际需求在表现层接入，见 FS-0020。 -->
    <n-dialog-provider>
      <n-message-provider>
        <!-- 路由进度条与全局网络横幅属于弱网反馈，见 FS-0025；二者都挂在根 Provider 内以复用主题。 -->
        <n-loading-bar-provider :to="false" container-style="position: fixed; top: 0; left: 0; right: 0; z-index: 60;">
          <UiRouteProgress />
          <UiNetworkBanner />
          <RouterView />
        </n-loading-bar-provider>
      </n-message-provider>
    </n-dialog-provider>
  </n-config-provider>
</template>
